import { describe, expect, it } from "vitest";
import { mensajeAmigable } from "./ejecutar";

const conCodigo = (code: string, message = "x") => Object.assign(new Error(message), { code });

describe("mensajeAmigable", () => {
  it.each([
    [conCodigo("ER_ACCESS_DENIED_ERROR"), /usuario o la contraseña/],
    [conCodigo("ER_BAD_DB_ERROR"), /no existe/],
    [conCodigo("ER_DBACCESS_DENIED_ERROR"), /permisos/],
    [conCodigo("ER_HOST_NOT_PRIVILEGED"), /MySQL remoto/],
    [conCodigo("ER_USER_LIMIT_REACHED"), /demasiadas conexiones/i],
    [conCodigo("ENOTFOUND"), /No se pudo conectar/],
    [conCodigo("ECONNREFUSED"), /No se pudo conectar/],
    [conCodigo("PROTOCOL_CONNECTION_LOST"), /No se pudo conectar/],
  ])("traduce %o", (error, esperado) => {
    expect(mensajeAmigable(error)).toMatch(esperado);
  });

  it("deja pasar el mensaje propio de cualquier otro error", () => {
    expect(mensajeAmigable(new Error("Falló la migración 0003 y no se registró: boom"))).toBe(
      "Falló la migración 0003 y no se registró: boom",
    );
  });

  it("no falla con valores que no son Error", () => {
    expect(mensajeAmigable("texto")).toBe("texto");
    expect(mensajeAmigable(undefined)).toBe("Error desconocido.");
    expect(mensajeAmigable(null)).toBe("Error desconocido.");
  });
});
