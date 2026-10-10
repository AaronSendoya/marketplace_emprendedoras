import { randomUUID } from "node:crypto";
import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limpiarRegistrosAntiguos } from "../../scripts/lib/limpieza";
import { conectar } from "./support/conexion";

// Regla 17 (retención de registros de abuso): las sentencias reales contra MySQL. Las fechas son de 2001 y "ahora" es el 2002 para
// que la limpieza solo alcance las filas de esta prueba y nunca las de otras.
const AHORA = new Date("2002-01-01T00:00:00.000Z");
const dias = (n: number) => new Date(AHORA.getTime() - n * 24 * 60 * 60 * 1000);
const correo = `limpieza-${randomUUID().slice(0, 8)}@prueba.test`;

const rolId = randomUUID();
const usuarioId = randomUUID();
const sesionDe = (nombre: string) => ({ nombre, id: randomUUID() });
const sesiones = {
  adminVencidaHace3Dias: sesionDe("admin vencida hace 3 días"),
  adminVencidaHace2Horas: sesionDe("admin vencida hace 2 horas"),
  adminVigente: sesionDe("admin vigente"),
  emprendedoraSinVencimiento: sesionDe("emprendedora sin vencimiento (antigua)"),
};

let conexion: Connection;

const ejecutor = {
  async borrar(sql: string, valores: unknown[]) {
    const [respuesta] = await conexion.query<ResultSetHeader>(sql, valores);
    return respuesta.affectedRows;
  },
};

async function sesionesDeLaPrueba(): Promise<string[]> {
  const [filas] = await conexion.query<RowDataPacket[]>("SELECT id FROM sesiones WHERE usuario_id = ?", [usuarioId]);
  return filas.map((f) => f.id as string);
}

async function contar(tabla: "intentos_login" | "otp_codigos"): Promise<number> {
  const [filas] = await conexion.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${tabla} WHERE email = ?`, [correo]);
  return Number(filas[0].total);
}

beforeAll(async () => {
  conexion = await conectar();
  await conexion.query("INSERT INTO roles (id, nombre) VALUES (?, ?)", [rolId, `limpieza-${correo}`]);
  await conexion.query(
    "INSERT INTO usuarios (id, email, nombres, apellido_paterno, password_hash, rol_id) VALUES (?, ?, 'Ana', 'Rojas', 'hash', ?)",
    [usuarioId, correo, rolId],
  );
  const insertarSesion = (id: string, creada: Date, vence: Date | null) =>
    conexion.query("INSERT INTO sesiones (id, usuario_id, creado_en, expira_en) VALUES (?, ?, ?, ?)", [id, usuarioId, creada, vence]);
  await insertarSesion(sesiones.adminVencidaHace3Dias.id, dias(4), dias(3));
  await insertarSesion(sesiones.adminVencidaHace2Horas.id, dias(1), new Date(AHORA.getTime() - 2 * 3_600_000));
  await insertarSesion(sesiones.adminVigente.id, dias(0), new Date(AHORA.getTime() + 3_600_000));
  await insertarSesion(sesiones.emprendedoraSinVencimiento.id, dias(900), null);
  for (const antiguedad of [45, 31, 29, 1]) {
    await conexion.query("INSERT INTO intentos_login (id, email, creado_en) VALUES (?, ?, ?)", [randomUUID(), correo, dias(antiguedad)]);
  }
  for (const antiguedad of [20, 8, 6, 1]) {
    await conexion.query(
      "INSERT INTO otp_codigos (id, email, proposito, codigo_hash, expira_en, creado_en) VALUES (?, ?, 'restablecer_password', 'hash-x', ?, ?)",
      [randomUUID(), correo, dias(antiguedad), dias(antiguedad)],
    );
  }
});

afterAll(async () => {
  await conexion.query("DELETE FROM intentos_login WHERE email = ?", [correo]);
  await conexion.query("DELETE FROM otp_codigos WHERE email = ?", [correo]);
  await conexion.query("DELETE FROM sesiones WHERE usuario_id = ?", [usuarioId]);
  await conexion.query("DELETE FROM usuarios WHERE id = ?", [usuarioId]);
  await conexion.query("DELETE FROM roles WHERE id = ?", [rolId]);
  await conexion.end();
});

describe("limpiarRegistrosAntiguos contra MySQL", () => {
  it("borra los intentos de acceso de más de 30 días y los códigos OTP de más de 7, y deja el resto", async () => {
    const resultado = await limpiarRegistrosAntiguos(ejecutor, AHORA);

    // Otras filas viejas de la base de pruebas, si las hubiera, también cuentan: al menos las de esta prueba.
    expect(resultado.intentosLogin).toBeGreaterThanOrEqual(2);
    expect(resultado.otp).toBeGreaterThanOrEqual(2);
    expect(await contar("intentos_login")).toBe(2); // 29 y 1 días
    expect(await contar("otp_codigos")).toBe(2); // 6 y 1 días
  });

  it("borra las sesiones de Admin vencidas hace más de un día, y nunca una vigente ni una sin vencimiento (Emprendedora)", async () => {
    await limpiarRegistrosAntiguos(ejecutor, AHORA);

    const quedan = await sesionesDeLaPrueba();
    expect(quedan).not.toContain(sesiones.adminVencidaHace3Dias.id);
    expect(quedan).toContain(sesiones.adminVencidaHace2Horas.id);
    expect(quedan).toContain(sesiones.adminVigente.id);
    expect(quedan).toContain(sesiones.emprendedoraSinVencimiento.id);
  });

  it("es repetible: una segunda corrida no encuentra nada más de esta prueba", async () => {
    await limpiarRegistrosAntiguos(ejecutor, AHORA);

    expect(await contar("intentos_login")).toBe(2);
    expect(await contar("otp_codigos")).toBe(2);
  });
});
