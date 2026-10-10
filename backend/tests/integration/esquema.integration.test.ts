import { randomUUID } from "node:crypto";
import type { Connection, RowDataPacket } from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { columnaDeError, ERRNO, nombreRestriccion } from "../../src/shared/infrastructure/errorMySql";
import { conectar } from "./support/conexion";

// Cada prueba corre dentro de una transacción que se revierte: no deja datos en la base de pruebas.
// (Solo hay DML: el DDL de MySQL confirma solo y no se puede revertir.)
let db: Connection;

beforeAll(async () => {
  db = await conectar();
});
afterAll(async () => {
  await db.end();
});
beforeEach(async () => {
  await db.beginTransaction();
});
afterEach(async () => {
  await db.rollback();
});

const esCheck = (errno: number) => errno === ERRNO.CHECK_MYSQL || errno === ERRNO.CHECK_MARIADB;

interface ErrorBd {
  errno: number;
  sqlMessage?: string;
}

// Devuelve el error de una consulta que debe fallar. A diferencia de PostgreSQL, en MySQL un
// error no aborta la transacción, pero cada prueba comprueba una sola violación igualmente.
async function fallo(consulta: Promise<unknown>): Promise<ErrorBd> {
  try {
    await consulta;
  } catch (error) {
    return error as ErrorBd;
  }
  throw new Error("Se esperaba que la consulta fallara y se ejecutó sin error");
}

const unico = () => randomUUID().slice(0, 8);

// Los ids los genera la aplicación: la base no tiene valor por defecto para ellos.
async function insertar(tabla: string, datos: Record<string, unknown>): Promise<string> {
  const id = randomUUID();
  const columnas = ["id", ...Object.keys(datos)];
  await db.query(`INSERT INTO ${tabla} (${columnas.join(", ")}) VALUES (${columnas.map(() => "?").join(", ")})`, [
    id,
    ...Object.values(datos),
  ]);
  return id;
}

const crearRol = (nombre = `rol-${unico()}`) => insertar("roles", { nombre });
const crearCiudad = () => insertar("ciudades", { nombre: `ciudad-${unico()}` });
const crearRubro = () => insertar("rubros", { nombre: `rubro-${unico()}` });

async function crearUsuario(email = `${unico()}@prueba.test`, rolId?: string) {
  return insertar("usuarios", {
    email,
    nombres: "Nombre",
    apellido_paterno: "Apellido",
    password_hash: "hash",
    rol_id: rolId ?? (await crearRol()),
  });
}

async function crearPerfil(usuarioId?: string, ciudadId?: string, rubroId?: string) {
  return insertar("perfiles_emprendedores", {
    usuario_id: usuarioId ?? (await crearUsuario()),
    nombre_negocio: "Negocio",
    descripcion: "Descripción",
    whatsapp: "59170000000",
    ciudad_id: ciudadId ?? (await crearCiudad()),
    rubro_id: rubroId ?? (await crearRubro()),
    foto_perfil_key: "perfiles/foto.webp",
    logo_key: "logos/logo.webp",
  });
}

const crearProducto = (perfilId: string) =>
  insertar("productos", { perfil_id: perfilId, nombre: "Producto", imagen_key: "productos/p.webp" });

const crearDescuento = (perfilId: string, porcentaje: string, inicio: Date | null = null, fin: Date | null = null) =>
  insertar("descuentos", { perfil_id: perfilId, porcentaje, fecha_inicio: inicio, fecha_fin: fin });

const asignar = (productoId: string, descuentoId: string) =>
  db.query("INSERT INTO producto_descuentos (producto_id, descuento_id) VALUES (?, ?)", [productoId, descuentoId]);

async function contar(tabla: string, columna: string, valor: string) {
  const [filas] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${tabla} WHERE ${columna} = ?`, [valor]);
  return Number(filas[0].total);
}

describe("sesión de pruebas", () => {
  it("corre en UTC y con el modo estricto", async () => {
    const [filas] = await db.query<RowDataPacket[]>("SELECT @@session.time_zone AS zona, @@session.sql_mode AS modo");

    expect(filas[0].zona).toBe("+00:00");
    expect(filas[0].modo).toContain("STRICT_ALL_TABLES");
    expect(filas[0].modo).toContain("ONLY_FULL_GROUP_BY");
  });

  it("los ids no tienen valor por defecto: los genera la aplicación", async () => {
    const error = await fallo(db.query("INSERT INTO roles (nombre) VALUES (?)", [`rol-${unico()}`]));

    expect(error.errno).toBe(ERRNO.SIN_VALOR_POR_DEFECTO);
    expect(columnaDeError(error)).toBe("id");
  });
});

describe("usuarios", () => {
  it("el correo es único", async () => {
    const rolId = await crearRol();
    await crearUsuario("repetido@prueba.test", rolId);

    const error = await fallo(crearUsuario("repetido@prueba.test", rolId));

    expect(error.errno).toBe(ERRNO.DUPLICADO);
    expect(nombreRestriccion(error)).toMatch(/uk_usuarios_email$/);
  });

  it("el correo es único sin distinguir mayúsculas", async () => {
    const rolId = await crearRol();
    await crearUsuario("ana@prueba.test", rolId);

    expect((await fallo(crearUsuario("ANA@Prueba.TEST", rolId))).errno).toBe(ERRNO.DUPLICADO);
  });

  it("nace activo, sin correo verificado y con token_version 0", async () => {
    const id = await crearUsuario();

    const [filas] = await db.query<RowDataPacket[]>(
      "SELECT activo, email_verificado_en, token_version FROM usuarios WHERE id = ?",
      [id],
    );
    expect({ ...filas[0] }).toEqual({ activo: 1, email_verificado_en: null, token_version: 0 });
  });

  it("un rol con usuarios no se puede borrar (RESTRICT)", async () => {
    const rolId = await crearRol();
    await crearUsuario(undefined, rolId);

    const error = await fallo(db.query("DELETE FROM roles WHERE id = ?", [rolId]));

    expect(error.errno).toBe(ERRNO.PADRE_REFERENCIADO);
  });
});

describe("perfiles_emprendedores (regla 6: relación 1:1)", () => {
  it("un segundo perfil para el mismo usuario falla", async () => {
    const usuarioId = await crearUsuario();
    await crearPerfil(usuarioId);

    const error = await fallo(crearPerfil(usuarioId));

    expect(error.errno).toBe(ERRNO.DUPLICADO);
    expect(nombreRestriccion(error)).toMatch(/uk_usuario_perfil$/);
  });

  it.each(["foto_perfil_key", "logo_key"])("%s es obligatoria y no tiene valor por defecto (regla 11)", async (columna) => {
    const usuarioId = await crearUsuario();
    const ciudadId = await crearCiudad();
    const rubroId = await crearRubro();
    const imagenes: Record<string, string> = { foto_perfil_key: "a.webp", logo_key: "b.webp" };
    delete imagenes[columna];
    const columnasImagen = Object.keys(imagenes);

    const consulta = db.query(
      `INSERT INTO perfiles_emprendedores
         (id, usuario_id, nombre_negocio, descripcion, whatsapp, ciudad_id, rubro_id, ${columnasImagen.join(", ")})
       VALUES (?, ?, 'Negocio', 'Descripción', '59170000000', ?, ?, ${columnasImagen.map(() => "?").join(", ")})`,
      [randomUUID(), usuarioId, ciudadId, rubroId, ...Object.values(imagenes)],
    );

    const error = await fallo(consulta);
    expect(error.errno).toBe(ERRNO.SIN_VALOR_POR_DEFECTO);
    expect(columnaDeError(error)).toBe(columna);
  });

  it.each(["ciudades", "rubros"])("una fila de %s con perfiles no se puede borrar (RESTRICT)", async (tabla) => {
    const ciudadId = await crearCiudad();
    const rubroId = await crearRubro();
    await crearPerfil(undefined, ciudadId, rubroId);

    const id = tabla === "ciudades" ? ciudadId : rubroId;
    const error = await fallo(db.query(`DELETE FROM ${tabla} WHERE id = ?`, [id]));

    expect(error.errno).toBe(ERRNO.PADRE_REFERENCIADO);
  });

  it("una ciudad inexistente falla con la restricción de la clave foránea", async () => {
    const error = await fallo(crearPerfil(undefined, randomUUID()));

    expect(error.errno).toBe(ERRNO.HIJO_SIN_PADRE);
    expect(nombreRestriccion(error)).toBe("fk_perfiles_ciudad");
  });

  it("borrar el usuario elimina en cascada su perfil, productos, descuentos y asignaciones", async () => {
    const usuarioId = await crearUsuario();
    const perfilId = await crearPerfil(usuarioId);
    const productoId = await crearProducto(perfilId);
    const descuentoId = await crearDescuento(perfilId, "10");
    await asignar(productoId, descuentoId);

    await db.query("DELETE FROM usuarios WHERE id = ?", [usuarioId]);

    expect(await contar("perfiles_emprendedores", "id", perfilId)).toBe(0);
    expect(await contar("productos", "id", productoId)).toBe(0);
    expect(await contar("descuentos", "id", descuentoId)).toBe(0);
    expect(await contar("producto_descuentos", "producto_id", productoId)).toBe(0);
  });

  it("actualizado_en se renueva solo al modificar el perfil", async () => {
    const perfilId = await crearPerfil();
    await db.query("UPDATE perfiles_emprendedores SET actualizado_en = '2020-01-01 00:00:00.000' WHERE id = ?", [perfilId]);

    await db.query("UPDATE perfiles_emprendedores SET nombre_negocio = 'Otro nombre' WHERE id = ?", [perfilId]);

    const [filas] = await db.query<RowDataPacket[]>(
      "SELECT TIMESTAMPDIFF(SECOND, actualizado_en, UTC_TIMESTAMP(3)) AS segundos FROM perfiles_emprendedores WHERE id = ?",
      [perfilId],
    );
    expect(Number(filas[0].segundos)).toBeLessThan(5);
  });
});

describe("productos (regla 7)", () => {
  it("nacen activos, con el precio visible y sin precio", async () => {
    const id = await crearProducto(await crearPerfil());

    const [filas] = await db.query<RowDataPacket[]>("SELECT activo, mostrar_precio, precio FROM productos WHERE id = ?", [id]);
    expect({ ...filas[0] }).toEqual({ activo: 1, mostrar_precio: 1, precio: null });
  });

  it("el precio conserva dos decimales exactos y llega como texto", async () => {
    const id = await insertar("productos", {
      perfil_id: await crearPerfil(),
      nombre: "Producto",
      imagen_key: "productos/p.webp",
      precio: "19.99",
    });

    const [filas] = await db.query<RowDataPacket[]>("SELECT precio FROM productos WHERE id = ?", [id]);
    expect(filas[0].precio).toBe("19.99");
  });
});

describe("descuentos (regla 8)", () => {
  it.each(["0", "-1", "100.01", "101"])("rechaza un porcentaje de %s", async (porcentaje) => {
    const perfilId = await crearPerfil();

    const error = await fallo(crearDescuento(perfilId, porcentaje));

    expect(esCheck(error.errno)).toBe(true);
    expect(nombreRestriccion(error)).toBe("ck_descuentos_porcentaje");
  });

  it.each(["0.01", "50", "100"])("acepta un porcentaje de %s", async (porcentaje) => {
    const perfilId = await crearPerfil();

    await expect(crearDescuento(perfilId, porcentaje)).resolves.toEqual(expect.any(String));
  });

  const hora = (texto: string) => new Date(texto);

  it.each([
    ["anterior a fecha_inicio", "2026-12-31T00:00:00-04:00", "2026-12-01T00:00:00-04:00"],
    ["igual a fecha_inicio", "2026-12-01T00:00:00-04:00", "2026-12-01T00:00:00-04:00"],
  ])("rechaza una fecha_fin %s", async (_caso, inicio, fin) => {
    const perfilId = await crearPerfil();

    const error = await fallo(crearDescuento(perfilId, "10", hora(inicio), hora(fin)));

    expect(esCheck(error.errno)).toBe(true);
    expect(nombreRestriccion(error)).toBe("ck_descuentos_rango_fechas");
  });

  it.each([
    ["sin fechas (permanente)", null, null],
    ["solo fecha_inicio", "2026-12-01T00:00:00-04:00", null],
    ["solo fecha_fin", null, "2026-12-31T23:59:59-04:00"],
    ["fecha_fin posterior a fecha_inicio", "2026-12-01T00:00:00-04:00", "2026-12-31T23:59:59-04:00"],
  ])("acepta %s", async (_caso, inicio, fin) => {
    const perfilId = await crearPerfil();

    await expect(
      crearDescuento(perfilId, "10", inicio ? hora(inicio) : null, fin ? hora(fin) : null),
    ).resolves.toEqual(expect.any(String));
  });

  it("guarda las fechas en UTC y con milisegundos", async () => {
    const perfilId = await crearPerfil();
    // 1 de diciembre 00:00 en La Paz (UTC-4) es 04:00 UTC.
    const id = await crearDescuento(perfilId, "10", new Date("2026-12-01T00:00:00.123-04:00"));

    const [filas] = await db.query<RowDataPacket[]>(
      "SELECT DATE_FORMAT(fecha_inicio, '%Y-%m-%d %H:%i:%s.%f') AS texto FROM descuentos WHERE id = ?",
      [id],
    );
    expect(filas[0].texto).toBe("2026-12-01 04:00:00.123000");
  });

  it("las fechas y las marcas de tiempo son DATETIME(3)", async () => {
    const [filas] = await db.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna, DATA_TYPE AS tipo, DATETIME_PRECISION AS precision_
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND COLUMN_NAME IN ('fecha_inicio', 'fecha_fin', 'creado_en', 'actualizado_en', 'expira_en', 'usado_en', 'email_verificado_en')
         AND TABLE_NAME <> '_migraciones'`,
    );

    expect(filas.length).toBeGreaterThan(0);
    expect(filas.filter((columna) => columna.tipo !== "datetime" || Number(columna.precision_) !== 3)).toEqual([]);
  });

  it("creado_en toma la hora actual en UTC aunque el servidor esté en otra zona", async () => {
    const id = await crearUsuario();

    const [filas] = await db.query<RowDataPacket[]>(
      "SELECT TIMESTAMPDIFF(SECOND, creado_en, UTC_TIMESTAMP(3)) AS segundos FROM usuarios WHERE id = ?",
      [id],
    );
    expect(Math.abs(Number(filas[0].segundos))).toBeLessThan(5);
  });
});

describe("producto_descuentos", () => {
  it("no admite la misma asignación dos veces", async () => {
    const perfilId = await crearPerfil();
    const productoId = await crearProducto(perfilId);
    const descuentoId = await crearDescuento(perfilId, "10");
    await asignar(productoId, descuentoId);

    const error = await fallo(asignar(productoId, descuentoId));

    expect(error.errno).toBe(ERRNO.DUPLICADO);
  });

  it("borrar el descuento quita la asignación pero conserva el producto", async () => {
    const perfilId = await crearPerfil();
    const productoId = await crearProducto(perfilId);
    const descuentoId = await crearDescuento(perfilId, "10");
    await asignar(productoId, descuentoId);

    await db.query("DELETE FROM descuentos WHERE id = ?", [descuentoId]);

    expect(await contar("producto_descuentos", "producto_id", productoId)).toBe(0);
    expect(await contar("productos", "id", productoId)).toBe(1);
  });
});

describe("otp_codigos (regla 15)", () => {
  const insertarOtp = (proposito: string) =>
    insertar("otp_codigos", {
      email: "otp@prueba.test",
      proposito,
      codigo_hash: "hash",
      expira_en: new Date(Date.now() + 10 * 60_000),
    });

  it.each(["verificar_email", "restablecer_password"])("acepta el propósito %s", async (proposito) => {
    await expect(insertarOtp(proposito)).resolves.toEqual(expect.any(String));
  });

  it("rechaza cualquier otro propósito", async () => {
    const error = await fallo(insertarOtp("otro_proposito"));

    expect(esCheck(error.errno)).toBe(true);
    expect(nombreRestriccion(error)).toBe("ck_otp_proposito");
  });

  it("nace sin intentos y sin usar", async () => {
    await insertarOtp("verificar_email");

    const [filas] = await db.query<RowDataPacket[]>(
      "SELECT intentos, usado_en FROM otp_codigos WHERE email = 'otp@prueba.test'",
    );
    expect({ ...filas[0] }).toEqual({ intentos: 0, usado_en: null });
  });
});

describe("intentos_login (regla 17)", () => {
  it("registra un intento fallido con el correo, aunque la cuenta no exista", async () => {
    const id = await insertar("intentos_login", { email: "sin-cuenta@prueba.test" });

    const [filas] = await db.query<RowDataPacket[]>("SELECT email FROM intentos_login WHERE id = ?", [id]);
    expect(filas[0].email).toBe("sin-cuenta@prueba.test");
  });

  it("email es obligatorio y no tiene valor por defecto", async () => {
    const error = await fallo(db.query("INSERT INTO intentos_login (id) VALUES (?)", [randomUUID()]));

    expect(error.errno).toBe(ERRNO.SIN_VALOR_POR_DEFECTO);
    expect(columnaDeError(error)).toBe("email");
  });

  it("creado_en toma la hora actual sin que la aplicación la indique", async () => {
    const id = await insertar("intentos_login", { email: "reciente@prueba.test" });

    const [filas] = await db.query<RowDataPacket[]>(
      "SELECT TIMESTAMPDIFF(SECOND, creado_en, UTC_TIMESTAMP(3)) AS segundos FROM intentos_login WHERE id = ?",
      [id],
    );
    expect(Math.abs(Number(filas[0].segundos))).toBeLessThan(5);
  });

  it("cuenta los intentos de un correo dentro de una ventana de tiempo (lo que hará el caso de uso)", async () => {
    const email = `ventana-${unico()}@prueba.test`;
    for (let i = 0; i < 3; i++) await insertar("intentos_login", { email });

    const [[{ total }]] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM intentos_login WHERE email = ? AND creado_en >= ?",
      [email, new Date(Date.now() - 15 * 60_000)],
    );
    expect(Number(total)).toBe(3);
  });
});

describe("sesiones (regla 5, migración 0009)", () => {
  it("una sesión de Emprendedora no vence (expira_en nulo) y creado_en toma la hora actual", async () => {
    const usuarioId = await crearUsuario();
    const id = await insertar("sesiones", { usuario_id: usuarioId });

    const [filas] = await db.query<RowDataPacket[]>(
      "SELECT expira_en, TIMESTAMPDIFF(SECOND, creado_en, UTC_TIMESTAMP(3)) AS segundos FROM sesiones WHERE id = ?",
      [id],
    );
    expect(filas[0].expira_en).toBeNull();
    expect(Math.abs(Number(filas[0].segundos))).toBeLessThan(5);
  });

  it("guarda la fecha de vencimiento de una sesión de Admin", async () => {
    const usuarioId = await crearUsuario();
    const vence = new Date("2030-01-01T04:00:00.000Z");
    const id = await insertar("sesiones", { usuario_id: usuarioId, expira_en: vence });

    const [filas] = await db.query<RowDataPacket[]>("SELECT expira_en FROM sesiones WHERE id = ?", [id]);
    expect(new Date(filas[0].expira_en).getTime()).toBe(vence.getTime());
  });

  it("usuario_id es obligatorio y no tiene valor por defecto", async () => {
    const error = await fallo(db.query("INSERT INTO sesiones (id) VALUES (?)", [randomUUID()]));

    expect(error.errno).toBe(ERRNO.SIN_VALOR_POR_DEFECTO);
    expect(columnaDeError(error)).toBe("usuario_id");
  });

  it("no admite una sesión de una cuenta que no existe", async () => {
    const error = await fallo(insertar("sesiones", { usuario_id: randomUUID() }));

    expect(error.errno).toBe(ERRNO.HIJO_SIN_PADRE);
  });

  it("una cuenta puede tener varias sesiones a la vez (varios dispositivos)", async () => {
    const usuarioId = await crearUsuario();
    for (let i = 0; i < 3; i++) await insertar("sesiones", { usuario_id: usuarioId });

    const [[{ total }]] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM sesiones WHERE usuario_id = ?", [usuarioId]);
    expect(Number(total)).toBe(3);
  });

  it("borrar la cuenta borra en cascada sus sesiones", async () => {
    const usuarioId = await crearUsuario();
    await insertar("sesiones", { usuario_id: usuarioId });

    await db.query("DELETE FROM usuarios WHERE id = ?", [usuarioId]);

    const [[{ total }]] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM sesiones WHERE usuario_id = ?", [usuarioId]);
    expect(Number(total)).toBe(0);
  });
});

describe("restricciones con mensaje propio (errorMySql)", () => {
  it("todas existen en la base con ese nombre", async () => {
    const { REGLAS_POR_RESTRICCION } = await import("../../src/shared/infrastructure/errorMySql");
    const [filas] = await db.query<RowDataPacket[]>(
      "SELECT TABLE_NAME AS tabla, CONSTRAINT_NAME AS nombre FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE()",
    );
    const existentes = new Set(filas.flatMap((fila) => [fila.nombre, `${fila.tabla}.${fila.nombre}`]));

    expect(Object.keys(REGLAS_POR_RESTRICCION).filter((nombre) => !existentes.has(nombre))).toEqual([]);
  });
});

describe("índices explícitos (migraciones 0002, 0004, 0005, 0007 y 0009)", () => {
  it("existen todos", async () => {
    const [filas] = await db.query<RowDataPacket[]>(
      "SELECT DISTINCT INDEX_NAME AS nombre FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME LIKE 'idx\\_%'",
    );

    expect(filas.map((fila) => fila.nombre).sort()).toEqual([
      "idx_clics_contacto_perfil_tipo",
      "idx_descuentos_perfil_id",
      "idx_intentos_login_email_creado",
      "idx_otp_codigos_email_proposito",
      "idx_perfiles_ciudad_id",
      "idx_perfiles_rubro_id",
      "idx_producto_descuentos_descuento_id",
      "idx_productos_perfil_activo",
      "idx_sesiones_usuario",
      "idx_usuarios_activo_creado_en",
    ]);
  });
});
