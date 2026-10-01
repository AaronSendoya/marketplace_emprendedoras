import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { resolverImagen } from "./imagenes";

describe("resolverImagen (regla 11)", () => {
  const archivo = Buffer.from("imagen");

  it("un archivo se devuelve tal cual", () => {
    expect(resolverImagen(archivo, undefined, "logo", "usar_logo_predeterminado")).toBe(archivo);
    expect(resolverImagen(archivo, false, "logo", "usar_logo_predeterminado")).toBe(archivo);
  });

  it("la marca explícita da la predeterminada", () => {
    expect(resolverImagen(undefined, true, "logo", "usar_logo_predeterminado")).toBe("predeterminada");
  });

  it("sin archivo ni marca es un error: la predeterminada nunca se aplica por omisión", () => {
    expect(() => resolverImagen(undefined, undefined, "logo", "usar_logo_predeterminado")).toThrow(ErrorValidacion);
    expect(() => resolverImagen(undefined, false, "logo", "usar_logo_predeterminado")).toThrow(ErrorValidacion);
  });

  it("archivo y marca a la vez es un error, señalando el campo", () => {
    expect(() => resolverImagen(archivo, true, "logo", "usar_logo_predeterminado")).toThrow(
      expect.objectContaining({ detalles: [expect.objectContaining({ campo: "logo" })] }),
    );
  });
});
