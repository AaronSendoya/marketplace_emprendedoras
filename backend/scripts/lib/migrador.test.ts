import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  calcularChecksum,
  leerMigraciones,
  normalizarSql,
  verificarHistorial,
  type Migracion,
} from "./migrador";

describe("normalizarSql", () => {
  it("da el mismo checksum con saltos de línea de Windows o Unix y con BOM", () => {
    const unix = "CREATE TABLE a (id int);\nCREATE TABLE b (id int);\n";
    const windows = "﻿CREATE TABLE a (id int);\r\nCREATE TABLE b (id int);\r\n";

    expect(calcularChecksum(normalizarSql(windows))).toBe(calcularChecksum(normalizarSql(unix)));
  });
});

describe("leerMigraciones", () => {
  let directorio: string;

  beforeEach(() => {
    directorio = mkdtempSync(join(tmpdir(), "migraciones-"));
  });
  afterEach(() => {
    rmSync(directorio, { recursive: true, force: true });
  });

  const crear = (nombre: string, sql = "SELECT 1;") => writeFileSync(join(directorio, nombre), sql);

  it("lee y ordena las migraciones e ignora lo que no es .sql", () => {
    crear("0002_segunda.sql");
    crear("0001_primera.sql");
    crear("LEEME.md");

    expect(leerMigraciones(directorio).map((m) => m.nombre)).toEqual(["0001_primera.sql", "0002_segunda.sql"]);
  });

  it("rechaza nombres que no siguen NNNN_descripcion.sql", () => {
    crear("1_primera.sql");

    expect(() => leerMigraciones(directorio)).toThrow(/Nombre de migración inválido/);
  });

  it("rechaza numeración repetida o con huecos", () => {
    crear("0001_a.sql");
    crear("0001_b.sql");
    expect(() => leerMigraciones(directorio)).toThrow(/consecutiva/);

    rmSync(join(directorio, "0001_b.sql"));
    crear("0003_c.sql");
    expect(() => leerMigraciones(directorio)).toThrow(/consecutiva/);
  });

  it.each(["BEGIN;", "  commit;", "ROLLBACK;", "START TRANSACTION;"])(
    "rechaza una migración que controla la transacción (%s)",
    (sentencia) => {
      crear("0001_a.sql", `${sentencia}\nSELECT 1;`);

      expect(() => leerMigraciones(directorio)).toThrow(/transacción/);
    },
  );

  it("las migraciones reales del repositorio están bien formadas", () => {
    const reales = leerMigraciones(join(process.cwd(), "db", "migrations"));

    expect(reales.length).toBeGreaterThanOrEqual(2);
    expect(reales[0].nombre).toBe("0001_esquema_inicial.sql");
  });
});

describe("verificarHistorial", () => {
  const migracion = (nombre: string, sql = `-- ${nombre}`): Migracion => ({
    nombre,
    sql,
    checksum: calcularChecksum(sql),
  });
  const migraciones = [migracion("0001_a.sql"), migracion("0002_b.sql"), migracion("0003_c.sql")];
  const registro = (m: Migracion) => ({ nombre: m.nombre, checksum: m.checksum });

  it("acepta una base vacía, parcial o completamente migrada", () => {
    expect(() => verificarHistorial([], migraciones)).not.toThrow();
    expect(() => verificarHistorial(migraciones.slice(0, 2).map(registro), migraciones)).not.toThrow();
    expect(() => verificarHistorial(migraciones.map(registro), migraciones)).not.toThrow();
  });

  it("detecta una migración ya aplicada que se modificó", () => {
    const aplicadas = [registro(migraciones[0]), { ...registro(migraciones[1]), checksum: "otro" }];

    expect(() => verificarHistorial(aplicadas, migraciones)).toThrow(/0002_b.sql ya se aplicó y luego se modificó/);
  });

  it("detecta una migración aplicada cuyo archivo desapareció", () => {
    const aplicadas = migraciones.map(registro);

    expect(() => verificarHistorial(aplicadas, migraciones.slice(0, 2))).toThrow(/0003_c.sql.*no existe/);
  });

  it("detecta una migración pendiente anterior a una ya aplicada", () => {
    const aplicadas = [registro(migraciones[0]), registro(migraciones[2])];

    expect(() => verificarHistorial(aplicadas, migraciones)).toThrow(/0002_b.sql está pendiente/);
  });
});
