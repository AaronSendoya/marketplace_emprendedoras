import { describe, expect, it } from "vitest";
import {
  EsquemaCambiarEmailBody,
  EsquemaPasswordNueva,
  EsquemaRestablecerPasswordBody,
  EsquemaSolicitarCodigoPasswordBody,
} from "./auth";

const mensajes = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
  resultado.error?.issues.map((i) => i.message) ?? [];

describe("EsquemaPasswordNueva (regla 15)", () => {
  it("acepta 8 caracteres y hasta 72 bytes", () => {
    expect(EsquemaPasswordNueva.safeParse("abcd1234").success).toBe(true);
    expect(EsquemaPasswordNueva.safeParse("a".repeat(72)).success).toBe(true);
  });

  it.each([
    ["corta", "corta"],
    ["73 caracteres", "a".repeat(73)],
    ["menos de 72 caracteres pero más de 72 bytes", "á".repeat(40)],
  ])("rechaza %s con un solo mensaje", (_caso, password) => {
    const resultado = EsquemaPasswordNueva.safeParse(password);

    expect(resultado.success).toBe(false);
    expect(mensajes(resultado)).toHaveLength(1);
  });
});

describe("cuerpos de OTP", () => {
  const valido = { email: "aaron@gmail.com", codigo: "482913", password_nueva: "ClaveNueva2026" };

  it("restablecer acepta el cuerpo válido", () => {
    expect(EsquemaRestablecerPasswordBody.safeParse(valido).success).toBe(true);
  });

  it.each(["12345", "1234567", "12345a", "", " 12345"])("rechaza el código %j", (codigo) => {
    expect(EsquemaRestablecerPasswordBody.safeParse({ ...valido, codigo }).success).toBe(false);
  });

  it("rechaza campos desconocidos (p. ej. rol) y correos inválidos o de más de 150 caracteres", () => {
    expect(EsquemaRestablecerPasswordBody.safeParse({ ...valido, rol: "Admin" }).success).toBe(false);
    expect(EsquemaSolicitarCodigoPasswordBody.safeParse({ email: "no-es-correo" }).success).toBe(false);
    expect(EsquemaSolicitarCodigoPasswordBody.safeParse({ email: `${"a".repeat(145)}@b.com` }).success).toBe(false);
    expect(EsquemaCambiarEmailBody.safeParse({ email_nuevo: "nuevo@gmail.com", codigo: "482913", extra: 1 }).success).toBe(false);
  });
});
