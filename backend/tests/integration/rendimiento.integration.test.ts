import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MySqlDescuentoRepository } from "../../src/core/descuentos/infrastructure/MySqlDescuentoRepository";
import { MySqlPerfilRepository } from "../../src/core/perfiles/infrastructure/MySqlPerfilRepository";
import { MySqlProductoRepository } from "../../src/core/productos/infrastructure/MySqlProductoRepository";
import { MySqlClient } from "../../src/shared/infrastructure/MySqlClient";
import { conectar, urlDePruebas } from "./support/conexion";

// Pruebas no funcionales sobre la base real: (1) las consultas del catálogo tienen sus índices y
// (2) el pool de conexiones aguanta ráfagas concurrentes sin bloquearse ni perder resultados.
let conexion: Connection;

beforeAll(async () => {
  conexion = await conectar();
});
afterAll(async () => {
  await conexion.end();
});

// Índices que las consultas necesitan (columnas en orden). Una columna filtrada sin índice obliga
// a recorrer toda la tabla: con miles de productos, el feed se degrada.
const INDICES_REQUERIDOS: { tabla: string; columnas: string[]; motivo: string }[] = [
  { tabla: "usuarios", columnas: ["email"], motivo: "login y OTP buscan por correo (único)" },
  { tabla: "perfiles_emprendedores", columnas: ["usuario_id"], motivo: "un perfil por usuario y \"mi perfil\" (único)" },
  { tabla: "perfiles_emprendedores", columnas: ["ciudad_id"], motivo: "filtro del feed de perfiles y del marketplace" },
  { tabla: "perfiles_emprendedores", columnas: ["rubro_id"], motivo: "filtro del feed de perfiles y del marketplace" },
  { tabla: "productos", columnas: ["perfil_id", "activo"], motivo: "productos de un perfil, activos o no" },
  { tabla: "descuentos", columnas: ["perfil_id"], motivo: "descuentos de un perfil" },
  { tabla: "producto_descuentos", columnas: ["producto_id", "descuento_id"], motivo: "descuentos vigentes de un producto (clave primaria)" },
  { tabla: "producto_descuentos", columnas: ["descuento_id"], motivo: "productos de un descuento" },
  { tabla: "intentos_login", columnas: ["email", "creado_en"], motivo: "freno de login por correo y ventana de tiempo" },
  { tabla: "otp_codigos", columnas: ["email", "proposito", "creado_en"], motivo: "último código y límites de solicitudes por correo" },
];

describe("índices de las consultas (caja blanca)", () => {
  async function indicesDe(tabla: string): Promise<string[][]> {
    const [filas] = await conexion.query<RowDataPacket[]>(
      `SELECT index_name, seq_in_index, column_name
       FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ?
       ORDER BY index_name, seq_in_index`,
      [tabla],
    );
    const porIndice = new Map<string, string[]>();
    for (const fila of filas) {
      const nombre = (fila.index_name ?? fila.INDEX_NAME) as string;
      const columna = (fila.column_name ?? fila.COLUMN_NAME) as string;
      porIndice.set(nombre, [...(porIndice.get(nombre) ?? []), columna]);
    }
    return [...porIndice.values()];
  }

  it.each(INDICES_REQUERIDOS.map((i) => [`${i.tabla}(${i.columnas.join(", ")})`, i] as const))("existe un índice que empieza con %s", async (_nombre, requerido) => {
    const indices = await indicesDe(requerido.tabla);

    const cubierto = indices.some((columnas) => requerido.columnas.every((c, i) => columnas[i] === c));
    expect(cubierto, `falta un índice en ${requerido.tabla}(${requerido.columnas.join(", ")}): ${requerido.motivo}`).toBe(true);
  });

  it("todas las tablas usan InnoDB y utf8mb4 (integridad referencial y acentos/eñes sin pérdida)", async () => {
    const [filas] = await conexion.query<RowDataPacket[]>(
      `SELECT t.table_name AS tabla, t.engine AS motor, c.character_set_name AS juego
       FROM information_schema.tables t
       JOIN information_schema.collations c ON c.collation_name = t.table_collation
       WHERE t.table_schema = DATABASE() AND t.table_type = 'BASE TABLE' AND t.table_name NOT LIKE '\\_%'`,
    );

    expect(filas.length).toBeGreaterThanOrEqual(10);
    for (const fila of filas) {
      expect(String(fila.motor ?? fila.ENGINE), fila.tabla ?? fila.TABLE_NAME).toBe("InnoDB");
      expect(String(fila.juego ?? fila.CHARACTER_SET_NAME), fila.tabla ?? fila.TABLE_NAME).toBe("utf8mb4");
    }
  });

  it("los ids guardan un UUID completo (CHAR(36)) y las claves de imagen caben (VARCHAR(255))", async () => {
    const [filas] = await conexion.query<RowDataPacket[]>(
      `SELECT table_name AS tabla, column_name AS columna, character_maximum_length AS largo
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND (column_name = 'id' OR column_name LIKE '%\\_key')
         AND table_name NOT LIKE '\\_%'`,
    );

    for (const fila of filas) {
      const largo = Number(fila.largo ?? fila.CHARACTER_MAXIMUM_LENGTH);
      const columna = String(fila.columna ?? fila.COLUMN_NAME);
      expect(largo, `${fila.tabla ?? fila.TABLE_NAME}.${columna}`).toBeGreaterThanOrEqual(columna === "id" ? 36 : 255);
    }
  });
});

describe("carga concurrente sobre el pool (robustez)", () => {
  const cliente = new MySqlClient(urlDePruebas(), { maxConexiones: 5 });
  const productos = new MySqlProductoRepository(cliente);
  const perfiles = new MySqlPerfilRepository(cliente);
  const descuentos = new MySqlDescuentoRepository(cliente);
  const prefijo = `carga-${randomUUID().slice(0, 8)}`;
  const ids: Record<"rol" | "ciudad" | "rubro" | "usuario" | "perfil", string> = { rol: randomUUID(), ciudad: randomUUID(), rubro: randomUUID(), usuario: randomUUID(), perfil: randomUUID() };
  const AHORA = new Date("2026-09-23T12:00:00.000Z");
  const productosCreados: string[] = [];

  beforeAll(async () => {
    await cliente.ejecutar("INSERT INTO roles (id, nombre) VALUES (?, ?)", [ids.rol, `${prefijo}-rol`]);
    await cliente.ejecutar("INSERT INTO ciudades (id, nombre) VALUES (?, ?)", [ids.ciudad, `${prefijo} Ciudad`]);
    await cliente.ejecutar("INSERT INTO rubros (id, nombre) VALUES (?, ?)", [ids.rubro, `${prefijo} Rubro`]);
    await cliente.ejecutar("INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'Carga', 'Prueba', 'hash', ?)", [
      ids.usuario,
      `${prefijo}@prueba.test`,
      ids.rol,
    ]);
    await perfiles.crear({
      usuarioId: ids.usuario,
      nombreNegocio: `${prefijo} Negocio`,
      descripcion: "d",
      whatsapp: "59171234567",
      instagramUsername: null,
      otraRedSocial: null,
      ciudadId: ids.ciudad,
      rubroId: ids.rubro,
      fotoPerfilKey: "perfiles/f.webp",
      logoKey: "logos/l.webp",
      ahora: AHORA,
    });
    const perfil = (await perfiles.buscarPorUsuarioId(ids.usuario))!;
    ids.perfil = perfil.id;
    const descuento = await descuentos.crear({ perfilId: perfil.id, porcentaje: 10, fechaInicio: null, fechaFin: null, descripcion: null, ahora: AHORA });
    for (let i = 0; i < 40; i++) {
      const producto = await productos.crear({
        perfilId: perfil.id,
        nombre: `${prefijo} Producto ${i}`,
        descripcion: null,
        precio: 10 + i,
        mostrarPrecio: true,
        imagenKey: "productos/p.webp",
        ahora: new Date(AHORA.getTime() + i * 1000),
      });
      productosCreados.push(producto.id);
    }
    await descuentos.asignar(descuento.id, productosCreados);
  });

  afterAll(async () => {
    await cliente.ejecutar("DELETE FROM perfiles_emprendedores WHERE id = ?", [ids.perfil]);
    await cliente.ejecutar("DELETE FROM usuarios WHERE id = ?", [ids.usuario]);
    await cliente.ejecutar("DELETE FROM ciudades WHERE id = ?", [ids.ciudad]);
    await cliente.ejecutar("DELETE FROM rubros WHERE id = ?", [ids.rubro]);
    await cliente.ejecutar("DELETE FROM roles WHERE id = ?", [ids.rol]);
    await cliente.cerrar();
  });

  it("200 consultas simultáneas del feed (con 5 conexiones) terminan, sin errores y con resultados idénticos", async () => {
    const inicio = performance.now();

    const resultados = await Promise.all(
      Array.from({ length: 200 }, () => productos.listarMarketplace(AHORA, { perfilId: ids.perfil }, { pagina: 1, limite: 20 })),
    );

    expect(performance.now() - inicio).toBeLessThan(15_000);
    for (const resultado of resultados) {
      expect(resultado.total).toBe(40);
      expect(resultado.datos).toHaveLength(20);
      expect(resultado.datos.every((p) => p.porcentajeVigente === 10)).toBe(true);
    }
    expect(new Set(resultados.map((r) => r.datos.map((p) => p.id).join())).size).toBe(1);
  });

  it("una mezcla de lecturas y escrituras concurrentes no deja datos a medias ni bloquea", async () => {
    const trabajos = Array.from({ length: 60 }, (_, i) =>
      i % 3 === 0
        ? productos.actualizar(productosCreados[i % 40], { mostrarPrecio: i % 2 === 0 }, new Date(AHORA.getTime() + i))
        : productos.listarPorPerfil(ids.perfil, AHORA, { pagina: 1 + (i % 2), limite: 20 }),
    );

    await expect(Promise.all(trabajos)).resolves.toHaveLength(60);
    expect((await productos.listarPorPerfil(ids.perfil, AHORA, { pagina: 1, limite: 50 })).total).toBe(40);
  });

  it("las escrituras concurrentes sobre la misma fila terminan (sin interbloqueos) y la última gana", async () => {
    const objetivo = productosCreados[0];

    await Promise.all(Array.from({ length: 30 }, (_, i) => productos.actualizar(objetivo, { nombre: `${prefijo} Concurrente ${i}` }, new Date(AHORA.getTime() + i))));

    expect((await productos.buscarPorId(objetivo, AHORA))?.nombre).toMatch(new RegExp(`^${prefijo} Concurrente \\d+$`));
  });

  it("el pool se recupera de errores: tras 20 consultas fallidas, las siguientes funcionan", async () => {
    const fallidas = await Promise.allSettled(Array.from({ length: 20 }, () => cliente.consultar("SELECT * FROM tabla_que_no_existe")));

    expect(fallidas.every((f) => f.status === "rejected")).toBe(true);
    await expect(cliente.consultar("SELECT 1 AS uno")).resolves.toEqual([{ uno: 1 }]);
  });
});
