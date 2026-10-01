import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { esPrecioValido, precioVisible, puedeGestionarProducto, validarPrecio } from "./Producto";

describe("precio (regla 7)", () => {
  it.each([0, 0.5, 12.5, 12.35, 19.99, 1234.56, 99_999_999.99])("acepta %s", (precio) => {
    expect(esPrecioValido(precio)).toBe(true);
  });

  it.each([-1, -0.01, 12.345, 0.001, 100_000_000, Number.NaN, Number.POSITIVE_INFINITY])("rechaza %s", (precio) => {
    expect(esPrecioValido(precio)).toBe(false);
  });

  it("validarPrecio acepta null y undefined (el precio es opcional) y lanza para uno inválido", () => {
    expect(() => validarPrecio(null)).not.toThrow();
    expect(() => validarPrecio(undefined)).not.toThrow();
    expect(() => validarPrecio(-1)).toThrow(ErrorValidacion);
  });
});

describe("precioVisible", () => {
  it.each([
    [10, true, true],
    [10, false, false],
    [null, true, false],
    [null, false, false],
    [0, true, true],
  ])("precio %s con mostrarPrecio %s -> %s", (precio, mostrarPrecio, esperado) => {
    expect(precioVisible({ precio, mostrarPrecio })).toBe(esperado);
  });
});

describe("puedeGestionarProducto (regla 18)", () => {
  it("la dueña y el Admin pueden; otra emprendedora no", () => {
    const producto = { perfil: { usuarioId: "usuario-1" } } as never;

    expect(puedeGestionarProducto({ id: "usuario-1", rol: "Emprendedor" }, producto)).toBe(true);
    expect(puedeGestionarProducto({ id: "admin-1", rol: "Admin" }, producto)).toBe(true);
    expect(puedeGestionarProducto({ id: "usuario-2", rol: "Emprendedor" }, producto)).toBe(false);
  });
});
