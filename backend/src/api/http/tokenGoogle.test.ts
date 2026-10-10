import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { CABECERA_TOKEN_DE_GOOGLE, leerTokenDeGoogle } from "./tokenGoogle";

const pedir = (token?: string) => new Request("http://localhost/api", { headers: token === undefined ? {} : { [CABECERA_TOKEN_DE_GOOGLE]: token } });

describe("leerTokenDeGoogle (regla 17)", () => {
  it("devuelve el token de la cabecera", () => {
    expect(leerTokenDeGoogle(pedir("ya29.a0AfH6SMBx-token_de.prueba~0123456789"))).toBe("ya29.a0AfH6SMBx-token_de.prueba~0123456789");
  });

  it("sin cabecera (o vacía) no hay conexión: null", () => {
    expect(leerTokenDeGoogle(pedir())).toBeNull();
    expect(leerTokenDeGoogle(pedir("   "))).toBeNull();
  });

  it("recorta espacios alrededor", () => {
    expect(leerTokenDeGoogle(pedir("  ya29.token-de-prueba-0000000000  "))).toBe("ya29.token-de-prueba-0000000000");
  });

  it.each([
    ["con espacios en medio", "ya29.token de prueba 0000000000000"],
    ["con una comilla", "ya29.token'de-prueba-0000000000000"],
    ["demasiado corto", "ya29.corto"],
    ["demasiado largo", `ya29.${"a".repeat(3000)}`],
    ["con caracteres de control", "ya29.token\u0001prueba-00000000000000"],
    ["con un punto y coma", "ya29.token;otra=cosa-000000000000"],
  ])("rechaza un token %s sin copiar su valor en el mensaje", (_nombre, token) => {
    let error: unknown;
    try {
      // `Headers` ya rechaza algunos; los que pasan los rechaza el lector.
      leerTokenDeGoogle(pedir(token));
    } catch (e) {
      error = e;
    }
    if (error === undefined) {
      throw new Error("Debía rechazarlo");
    }
    if (error instanceof ErrorValidacion) {
      expect(error.message).not.toContain(token);
      expect(error.detalles?.[0].campo).toBe("google");
    }
  });
});
