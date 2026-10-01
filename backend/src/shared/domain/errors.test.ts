import { describe, expect, it } from "vitest";
import {
  ErrorArchivoMuyGrande,
  ErrorConflicto,
  ErrorDemasiadasSolicitudes,
  ErrorDeDominio,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorProhibido,
  ErrorValidacion,
} from "./errors";

describe("errores de dominio", () => {
  it.each([
    [new ErrorValidacion("x"), "VALIDACION"],
    [new ErrorNoAutenticado(), "NO_AUTENTICADO"],
    [new ErrorProhibido(), "PROHIBIDO"],
    [new ErrorNoEncontrado(), "NO_ENCONTRADO"],
    [new ErrorConflicto("x"), "CONFLICTO"],
    [new ErrorArchivoMuyGrande("x"), "ARCHIVO_MUY_GRANDE"],
    [new ErrorDemasiadasSolicitudes(), "DEMASIADAS_SOLICITUDES"],
  ])("%o tiene el código %s", (error, codigo) => {
    expect(error).toBeInstanceOf(ErrorDeDominio);
    expect(error).toBeInstanceOf(Error);
    expect(error.codigo).toBe(codigo);
  });

  it("todos los errores traen un mensaje por defecto", () => {
    expect(new ErrorValidacion().message).toBe("Los datos enviados no son válidos.");
    expect(new ErrorNoAutenticado().message).toBe("No autenticado.");
    expect(new ErrorProhibido().message).toMatch(/permiso/);
    expect(new ErrorNoEncontrado().message).toBe("Recurso no encontrado.");
    expect(new ErrorConflicto().message).toMatch(/conflicto/);
    expect(new ErrorArchivoMuyGrande().message).toMatch(/5 MB/);
    expect(new ErrorDemasiadasSolicitudes().message).toMatch(/Demasiadas solicitudes/);
  });

  it("un mensaje personalizado reemplaza al de por defecto", () => {
    expect(new ErrorNoAutenticado("Credenciales inválidas.").message).toBe("Credenciales inválidas.");
  });

  it("conserva los detalles y el tiempo de reintento", () => {
    const detalles = [{ campo: "email", mensaje: "Inválido" }];

    expect(new ErrorValidacion("x", detalles).detalles).toEqual(detalles);
    expect(new ErrorDemasiadasSolicitudes("x", 60).reintentarEnSegundos).toBe(60);
  });
});
