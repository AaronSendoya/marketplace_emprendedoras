import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { LARGO_MAXIMO_DESCRIPCION_DESCUENTO, normalizarDescripcion, puedeGestionarDescuento, validarPorcentaje } from "./Descuento";

describe("validarPorcentaje (regla 8)", () => {
  it.each([0.01, 1, 15, 15.5, 99.99, 100])("acepta %s", (valor) => {
    expect(() => validarPorcentaje(valor)).not.toThrow();
  });

  it.each([0, -5, 100.01, 101, 15.555, Number.NaN, Number.POSITIVE_INFINITY])("rechaza %s", (valor) => {
    expect(() => validarPorcentaje(valor)).toThrow(ErrorValidacion);
  });

  it("acepta decimales que en coma flotante no son exactos (0.07, 33.33)", () => {
    expect(() => validarPorcentaje(0.07)).not.toThrow();
    expect(() => validarPorcentaje(33.33)).not.toThrow();
  });
});

describe("normalizarDescripcion (regla 8: detalle de hasta 280 caracteres)", () => {
  it("el límite es de 280 caracteres, el mismo de la columna", () => {
    expect(LARGO_MAXIMO_DESCRIPCION_DESCUENTO).toBe(280);
  });

  it("recorta los espacios de los extremos y respeta lo de adentro, saltos de línea incluidos", () => {
    expect(normalizarDescripcion("  Día de la Madre  ")).toBe("Día de la Madre");
    expect(normalizarDescripcion("Línea uno\n\nLínea dos")).toBe("Línea uno\n\nLínea dos");
  });

  it.each([undefined, null, "", "   ", "\n\t "])("%j es lo mismo que no tener detalle (null)", (valor) => {
    expect(normalizarDescripcion(valor)).toBeNull();
  });

  it("acepta exactamente 280 caracteres, y los espacios de los extremos no cuentan", () => {
    expect(normalizarDescripcion("a".repeat(280))).toBe("a".repeat(280));
    expect(normalizarDescripcion(` ${"a".repeat(280)} `)).toBe("a".repeat(280));
  });

  it("rechaza 281 caracteres con un error de validación del campo descripcion", () => {
    try {
      normalizarDescripcion("a".repeat(281));
      expect.unreachable("debía lanzar");
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorValidacion);
      expect((error as ErrorValidacion).detalles).toEqual([{ campo: "descripcion", mensaje: "El detalle no puede superar los 280 caracteres." }]);
    }
  });

  it("cuenta unidades UTF-16: un emoji vale 2, así la API nunca es más permisiva que la base", () => {
    expect(() => normalizarDescripcion("😀".repeat(140))).not.toThrow();
    expect(() => normalizarDescripcion("😀".repeat(141))).toThrow(ErrorValidacion);
  });
});

describe("puedeGestionarDescuento (regla 18)", () => {
  it("la dueña del perfil y el Admin pueden; otra emprendedora no", () => {
    const descuento = { perfilUsuarioId: "usuario-1" };

    expect(puedeGestionarDescuento({ id: "usuario-1", rol: "Emprendedor" }, descuento)).toBe(true);
    expect(puedeGestionarDescuento({ id: "admin-1", rol: "Admin" }, descuento)).toBe(true);
    expect(puedeGestionarDescuento({ id: "usuario-2", rol: "Emprendedor" }, descuento)).toBe(false);
  });
});
