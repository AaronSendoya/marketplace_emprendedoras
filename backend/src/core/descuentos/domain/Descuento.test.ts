import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { puedeGestionarDescuento, validarPorcentaje } from "./Descuento";

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

describe("puedeGestionarDescuento (regla 18)", () => {
  it("la dueña del perfil y el Admin pueden; otra emprendedora no", () => {
    const descuento = { perfilUsuarioId: "usuario-1" };

    expect(puedeGestionarDescuento({ id: "usuario-1", rol: "Emprendedor" }, descuento)).toBe(true);
    expect(puedeGestionarDescuento({ id: "admin-1", rol: "Admin" }, descuento)).toBe(true);
    expect(puedeGestionarDescuento({ id: "usuario-2", rol: "Emprendedor" }, descuento)).toBe(false);
  });
});
