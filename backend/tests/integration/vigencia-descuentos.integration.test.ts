import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conectar } from "./support/conexion";

// La consulta del feed de la regla 8 (CLAUDE.md), más el filtro por perfil para aislar cada prueba.
// El paso 12 la moverá al repositorio de productos; hasta entonces esta copia comprueba que el SQL
// corre en MySQL y en MariaDB y que la vigencia se evalúa como dice la regla.
const CONSULTA_FEED = `
  SELECT p.nombre,
         dv.porcentaje,
         ROUND(p.precio * (1 - dv.porcentaje / 100), 2) AS precio_con_descuento
  FROM productos p
  LEFT JOIN (
      SELECT pd.producto_id, MAX(d.porcentaje) AS porcentaje
      FROM producto_descuentos pd
      JOIN descuentos d ON d.id = pd.descuento_id
      WHERE (d.fecha_inicio IS NULL OR d.fecha_inicio <= ?)
        AND (d.fecha_fin IS NULL OR d.fecha_fin >= ?)
      GROUP BY pd.producto_id
  ) dv ON dv.producto_id = p.id
  WHERE p.activo = 1 AND p.perfil_id = ?
  ORDER BY p.nombre`;

let db: Connection;
let perfilId: string;

beforeAll(async () => {
  db = await conectar();
});
afterAll(async () => {
  await db.end();
});
beforeEach(async () => {
  await db.beginTransaction();
  const sufijo = randomUUID().slice(0, 8);
  const ids = { rol: randomUUID(), usuario: randomUUID(), ciudad: randomUUID(), rubro: randomUUID() };
  perfilId = randomUUID();
  await db.query("INSERT INTO roles (id, nombre) VALUES (?, ?)", [ids.rol, `rol-${sufijo}`]);
  await db.query("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [ids.ciudad, `ciudad-${sufijo}`]);
  await db.query("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [ids.rubro, `rubro-${sufijo}`]);
  await db.query(
    "INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'N', 'A', 'h', ?)",
    [ids.usuario, `${sufijo}@prueba.test`, ids.rol],
  );
  await db.query(
    `INSERT INTO perfiles_emprendedores
       (id, usuario_id, nombre_negocio, descripcion, whatsapp, ciudad_id, rubro_id, foto_perfil_key, logo_key)
     VALUES (?, ?, 'Negocio', 'D', '59170000000', ?, ?, 'f.webp', 'l.webp')`,
    [perfilId, ids.usuario, ids.ciudad, ids.rubro],
  );
});
afterEach(async () => {
  await db.rollback();
});

async function producto(nombre: string, precio: string | null, activo = true) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO productos (id, perfil_id, nombre, precio, imagen_key, activo) VALUES (?, ?, ?, ?, 'p.webp', ?)",
    [id, perfilId, nombre, precio, activo],
  );
  return id;
}

async function descuento(productoId: string, porcentaje: string, inicio: string | null, fin: string | null) {
  const id = randomUUID();
  await db.query("INSERT INTO descuentos (id, perfil_id, porcentaje, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?)", [
    id,
    perfilId,
    porcentaje,
    inicio ? new Date(inicio) : null,
    fin ? new Date(fin) : null,
  ]);
  await db.query("INSERT INTO producto_descuentos (producto_id, descuento_id) VALUES (?, ?)", [productoId, id]);
}

async function feed(ahora: string) {
  const instante = new Date(ahora);
  const [filas] = await db.query<RowDataPacket[]>(CONSULTA_FEED, [instante, instante, perfilId]);
  return filas.map((fila) => ({ ...fila }));
}

const AHORA = "2026-12-15T12:00:00-04:00";

describe("consulta del feed: vigencia de los descuentos (regla 8)", () => {
  it("un producto sin descuentos sale sin porcentaje ni precio con descuento", async () => {
    await producto("Sin descuento", "100.00");

    expect(await feed(AHORA)).toEqual([{ nombre: "Sin descuento", porcentaje: null, precio_con_descuento: null }]);
  });

  it("un descuento permanente (sin fechas) se aplica", async () => {
    await descuento(await producto("Permanente", "100.00"), "10", null, null);

    expect(await feed(AHORA)).toEqual([{ nombre: "Permanente", porcentaje: "10.00", precio_con_descuento: "90.00" }]);
  });

  it("un descuento programado no se aplica hasta su fecha de inicio y se activa solo", async () => {
    // Navideño: del 1 al 31 de diciembre de 2026, hora de La Paz.
    await descuento(await producto("Navideño", "200.00"), "25", "2026-12-01T00:00:00-04:00", "2026-12-31T23:59:59-04:00");

    expect((await feed("2026-11-30T23:59:59-04:00"))[0].porcentaje).toBeNull(); // aún no empieza
    expect((await feed("2026-12-01T00:00:00-04:00"))[0]).toMatchObject({ porcentaje: "25.00", precio_con_descuento: "150.00" }); // inicio exacto
    expect((await feed(AHORA))[0].porcentaje).toBe("25.00"); // en pleno periodo
    expect((await feed("2026-12-31T23:59:59-04:00"))[0].porcentaje).toBe("25.00"); // el último día cuenta completo
    expect((await feed("2027-01-01T00:00:00-04:00"))[0].porcentaje).toBeNull(); // ya venció
  });

  it("un descuento con solo fecha_inicio o solo fecha_fin respeta ese límite", async () => {
    await descuento(await producto("A solo inicio", "100.00"), "10", "2026-12-20T00:00:00-04:00", null);
    await descuento(await producto("B solo fin", "100.00"), "20", null, "2026-12-10T00:00:00-04:00");

    const [soloInicio, soloFin] = await feed(AHORA);

    expect(soloInicio.porcentaje).toBeNull(); // empieza dentro de 5 días
    expect(soloFin.porcentaje).toBeNull(); // terminó hace 5 días
  });

  it("con varios descuentos vigentes a la vez se aplica solo el mayor, y hay una sola fila", async () => {
    const id = await producto("Varios", "100.00");
    await descuento(id, "10", null, null);
    await descuento(id, "25", null, null);
    await descuento(id, "15", "2026-12-01T00:00:00-04:00", "2026-12-31T23:59:59-04:00");
    await descuento(id, "50", "2027-01-01T00:00:00-04:00", null); // programado: no cuenta
    await descuento(id, "90", null, "2026-12-01T00:00:00-04:00"); // vencido: no cuenta

    expect(await feed(AHORA)).toEqual([{ nombre: "Varios", porcentaje: "25.00", precio_con_descuento: "75.00" }]);
  });

  it("un producto sin precio devuelve el porcentaje pero no el precio con descuento", async () => {
    await descuento(await producto("Sin precio", null), "20", null, null);

    expect(await feed(AHORA)).toEqual([{ nombre: "Sin precio", porcentaje: "20.00", precio_con_descuento: null }]);
  });

  it("los productos inactivos no salen", async () => {
    await producto("Inactivo", "100.00", false);
    await producto("Activo", "100.00");

    expect((await feed(AHORA)).map((fila) => fila.nombre)).toEqual(["Activo"]);
  });

  it("redondea el precio con descuento a dos decimales", async () => {
    await descuento(await producto("Redondeo", "19.99"), "33.33", null, null);

    expect((await feed(AHORA))[0].precio_con_descuento).toBe("13.33"); // 19.99 x 0.6667
  });

  it("no depende de la zona horaria de la sesión: el mismo instante da el mismo resultado", async () => {
    await descuento(await producto("Zona", "100.00"), "10", "2026-12-01T00:00:00-04:00", "2026-12-31T23:59:59-04:00");

    const enUtc = await feed("2026-12-31T23:59:59-04:00");
    await db.query("SET time_zone = '-04:00'");
    const enLaPaz = await feed("2026-12-31T23:59:59-04:00");

    expect(enLaPaz).toEqual(enUtc);
    expect(enUtc[0].porcentaje).toBe("10.00");
  });
});
