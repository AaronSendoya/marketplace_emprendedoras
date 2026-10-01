import { describe, expect, it } from "vitest";
import { opcionesDeConexion, parsearUrlMySql, SQL_INICIO_SESION } from "./opcionesMySql";

describe("parsearUrlMySql", () => {
  it("lee host, puerto, usuario, clave y base", () => {
    expect(parsearUrlMySql("mysql://catalogo:secreta@db.ejemplo.com:3307/catalogo_dev")).toEqual({
      host: "db.ejemplo.com",
      puerto: 3307,
      usuario: "catalogo",
      clave: "secreta",
      base: "catalogo_dev",
      ssl: undefined,
    });
  });

  it("usa el puerto 3306 si no se indica", () => {
    expect(parsearUrlMySql("mysql://u:p@localhost/catalogo").puerto).toBe(3306);
  });

  it("decodifica los caracteres especiales de usuario y clave", () => {
    const { usuario, clave } = parsearUrlMySql(`mysql://${encodeURIComponent("u@x")}:${encodeURIComponent("p:a/ss#?")}@host/db`);

    expect(usuario).toBe("u@x");
    expect(clave).toBe("p:a/ss#?");
  });

  it("acepta una clave vacía", () => {
    expect(parsearUrlMySql("mysql://root:@localhost/db").clave).toBe("");
  });

  it.each([
    ["true", "verificado"],
    ["no-verify", "sin-verificar"],
    ["false", undefined],
  ])("interpreta ?ssl=%s", (valor, esperado) => {
    expect(parsearUrlMySql(`mysql://u:p@host/db?ssl=${valor}`).ssl).toBe(esperado);
  });

  it.each([
    ["otro motor", "postgresql://u:p@host/db", /mysql:\/\//],
    ["sin nombre de base", "mysql://u:p@host:3306", /nombre de la base/],
    ["texto que no es URL", "no es una url", /URL válida/],
  ])("rechaza %s", (_caso, url, mensaje) => {
    expect(() => parsearUrlMySql(url)).toThrow(mensaje);
  });

  it("los errores no repiten la cadena recibida (puede llevar la contraseña)", () => {
    for (const url of ["postgresql://u:clave-secreta@host/db", "mysql://u:clave-secreta@host"]) {
      expect(() => parsearUrlMySql(url)).toThrow(expect.not.stringContaining("clave-secreta"));
    }
  });
});

describe("opcionesDeConexion", () => {
  it("fija UTC, utf8mb4 y un tiempo máximo de conexión", () => {
    const opciones = opcionesDeConexion("mysql://u:p@127.0.0.1:3306/catalogo_dev");

    expect(opciones).toMatchObject({
      host: "127.0.0.1",
      port: 3306,
      user: "u",
      password: "p",
      database: "catalogo_dev",
      charset: "utf8mb4_unicode_ci",
      timezone: "Z",
      connectTimeout: 10_000,
    });
    expect(opciones.ssl).toBeUndefined();
  });

  it("?ssl=true verifica el certificado y ?ssl=no-verify no", () => {
    expect(opcionesDeConexion("mysql://u:p@h/db?ssl=true").ssl).toEqual({ minVersion: "TLSv1.2", rejectUnauthorized: true });
    expect(opcionesDeConexion("mysql://u:p@h/db?ssl=no-verify").ssl).toEqual({
      minVersion: "TLSv1.2",
      rejectUnauthorized: false,
    });
  });

  // Regla 17: fuera del computador, la conexión a MySQL exige TLS.
  it.each([
    ["127.0.0.1", "mysql://u:p@127.0.0.1:3306/catalogo_dev"],
    ["localhost", "mysql://u:p@localhost:3306/catalogo_dev"],
    ["LOCALHOST (sin distinguir mayúsculas)", "mysql://u:p@LOCALHOST:3306/catalogo_dev"],
    ["::1", "mysql://u:p@[::1]:3306/catalogo_dev"],
  ])("sin TLS, %s se acepta (es el propio computador)", (_caso, url) => {
    expect(() => opcionesDeConexion(url)).not.toThrow();
  });

  it("sin TLS, un host remoto se rechaza sin conectar", () => {
    expect(() => opcionesDeConexion("mysql://u:p@db.hostinger.com:3306/catalogo")).toThrow(
      /db\.hostinger\.com[\s\S]*no es local[\s\S]*\?ssl=true/,
    );
  });

  it.each(["true", "no-verify"])("un host remoto con ?ssl=%s se acepta", (ssl) => {
    expect(() => opcionesDeConexion(`mysql://u:p@db.hostinger.com:3306/catalogo?ssl=${ssl}`)).not.toThrow();
  });

  it("el error de TLS no repite la contraseña", () => {
    expect(() => opcionesDeConexion("mysql://u:clave-secreta@db.hostinger.com/catalogo")).toThrow(
      expect.not.stringContaining("clave-secreta"),
    );
  });
});

describe("SQL_INICIO_SESION", () => {
  it("fija la zona UTC y el modo estricto", () => {
    expect(SQL_INICIO_SESION).toContain("time_zone = '+00:00'");
    expect(SQL_INICIO_SESION).toContain("STRICT_ALL_TABLES");
    expect(SQL_INICIO_SESION).toContain("ONLY_FULL_GROUP_BY");
  });
});
