import { join } from "node:path";
import type { Connection, RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  aplicarMigraciones,
  calcularChecksum,
  leerMigraciones,
  type Migracion,
} from "../../scripts/lib/migrador";
import { conectar } from "./support/conexion";

// El globalSetup ya aplicó las migraciones a la base de pruebas: aquí se comprueba el ejecutor
// sobre una base migrada. Necesita varias sentencias por consulta, como el ejecutor real.
const migraciones = leerMigraciones(join(process.cwd(), "db", "migrations"));
let db: Connection;

beforeAll(async () => {
  db = await conectar({ multiplesSentencias: true });
});
afterAll(async () => {
  await db.query("DROP TABLE IF EXISTS _prueba_migracion_fallida");
  await db.end();
});

describe("ejecutor de migraciones", () => {
  it("una segunda ejecución no aplica nada", async () => {
    expect(await aplicarMigraciones(db, migraciones)).toEqual([]);
  });

  it("deja registrada cada migración con su checksum", async () => {
    const [filas] = await db.query<RowDataPacket[]>("SELECT nombre, checksum FROM _migraciones ORDER BY nombre");

    expect(filas.map(({ nombre, checksum }) => ({ nombre, checksum }))).toEqual(
      migraciones.map(({ nombre, checksum }) => ({ nombre, checksum })),
    );
  });

  it("se detiene si una migración ya aplicada fue modificada", async () => {
    const alteradas = migraciones.map((m, i) => (i === 0 ? { ...m, checksum: "distinto" } : m));

    await expect(aplicarMigraciones(db, alteradas)).rejects.toThrow(/ya se aplicó y luego se modificó/);
  });

  it("una migración que falla no se registra, avisa que el DDL no se revierte y se puede reintentar", async () => {
    // MySQL confirma cada CREATE al ejecutarlo: la tabla de la primera sentencia queda creada.
    const numero = String(migraciones.length + 1).padStart(4, "0");
    const sql =
      "CREATE TABLE IF NOT EXISTS _prueba_migracion_fallida (id INT);\nINSERT INTO tabla_que_no_existe (id) VALUES (1);";
    const fallida: Migracion = { nombre: `${numero}_prueba_fallida.sql`, sql, checksum: calcularChecksum(sql) };

    await expect(aplicarMigraciones(db, [...migraciones, fallida])).rejects.toThrow(
      /Falló la migración [\s\S]*prueba_fallida\.sql y no se registró[\s\S]*no revierte el DDL/,
    );

    const [tabla] = await db.query<RowDataPacket[]>(
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prueba_migracion_fallida'",
    );
    expect(tabla).toHaveLength(1);
    const [registro] = await db.query<RowDataPacket[]>("SELECT 1 FROM _migraciones WHERE nombre = ?", [fallida.nombre]);
    expect(registro).toHaveLength(0);

    // Reintento con la migración corregida: la tabla ya existe (IF NOT EXISTS) y ahora sí se registra.
    const arreglada: Migracion = {
      ...fallida,
      sql: "CREATE TABLE IF NOT EXISTS _prueba_migracion_fallida (id INT);",
      checksum: calcularChecksum("CREATE TABLE IF NOT EXISTS _prueba_migracion_fallida (id INT);"),
    };
    expect(await aplicarMigraciones(db, [...migraciones, arreglada])).toEqual([arreglada.nombre]);
    await db.query("DELETE FROM _migraciones WHERE nombre = ?", [arreglada.nombre]);
  });

  it("libera el bloqueo al terminar (otra conexión puede tomarlo)", async () => {
    const otra = await conectar();
    try {
      const [filas] = await otra.query<RowDataPacket[]>("SELECT GET_LOCK('catalogo_migraciones', 0) AS obtenido");
      expect(Number(filas[0].obtenido)).toBe(1);
      await otra.query("SELECT RELEASE_LOCK('catalogo_migraciones')");
    } finally {
      await otra.end();
    }
  });
});
