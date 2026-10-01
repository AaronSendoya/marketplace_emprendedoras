import { describe, expect, it } from "vitest";
import { destinoDe, exigirDesarrollo, hostDe, mismaBase } from "./entorno";

describe("exigirDesarrollo (regla 13)", () => {
  it("permite el seed solo con APP_ENV=development", () => {
    expect(() => exigirDesarrollo("development")).not.toThrow();
  });

  it.each(["production", "test", "Development", "", undefined])("se niega con APP_ENV=%s", (valor) => {
    expect(() => exigirDesarrollo(valor)).toThrow(/solo corre con APP_ENV=development/);
  });
});

describe("hostDe y destinoDe", () => {
  it("devuelven solo el destino, sin usuario ni contraseña", () => {
    const url = "mysql://catalogo:clave-secreta@db.ejemplo.com:3307/catalogo_dev";

    expect(hostDe(url)).toBe("db.ejemplo.com");
    expect(destinoDe(url)).toBe("db.ejemplo.com:3307/catalogo_dev");
    expect(destinoDe(url)).not.toContain("clave-secreta");
  });
});

describe("mismaBase", () => {
  it("es la misma si coinciden host, puerto y nombre, sin importar usuario ni clave", () => {
    expect(mismaBase("mysql://a:1@db.ejemplo.com:3306/catalogo", "mysql://b:2@DB.ejemplo.com/catalogo")).toBe(true);
  });

  it("trata localhost, 127.0.0.1 y ::1 como la misma máquina", () => {
    expect(mismaBase("mysql://u:p@localhost/catalogo", "mysql://u:p@127.0.0.1:3306/catalogo")).toBe(true);
  });

  it.each([
    ["otro nombre de base", "mysql://u:p@127.0.0.1/catalogo_dev", "mysql://u:p@127.0.0.1/catalogo_test"],
    ["otro puerto", "mysql://u:p@127.0.0.1:3306/catalogo", "mysql://u:p@127.0.0.1:3307/catalogo"],
    ["otro host", "mysql://u:p@db1.ejemplo.com/catalogo", "mysql://u:p@db2.ejemplo.com/catalogo"],
  ])("es distinta con %s", (_caso, a, b) => {
    expect(mismaBase(a, b)).toBe(false);
  });
});
