import { describe, expect, it } from "vitest";
import { conMayusculaInicial, separarNombreCompleto } from "./NombreCompleto";

describe("separarNombreCompleto (regla 10)", () => {
  it("con 2 palabras: la primera es el nombre y la segunda el apellido paterno", () => {
    expect(separarNombreCompleto("Ana Pérez")).toEqual({ nombres: "Ana", apellidoPaterno: "Pérez", apellidoMaterno: null, avisos: [] });
  });

  it("con 3 palabras: las dos últimas son los apellidos, y se avisa porque es ambiguo", () => {
    expect(separarNombreCompleto("Ana Pérez Rojas")).toEqual({
      nombres: "Ana",
      apellidoPaterno: "Pérez",
      apellidoMaterno: "Rojas",
      avisos: ["tres_palabras"],
    });
  });

  it("con 4 palabras: dos nombres y dos apellidos, sin avisos", () => {
    expect(separarNombreCompleto("Ana María Pérez Rojas")).toEqual({
      nombres: "Ana María",
      apellidoPaterno: "Pérez",
      apellidoMaterno: "Rojas",
      avisos: [],
    });
  });

  it("con 5 palabras o más: todo menos los dos últimos son nombres", () => {
    expect(separarNombreCompleto("Ana María Luisa Pérez Rojas").nombres).toBe("Ana María Luisa");
  });

  it("con una sola palabra o vacío: no se puede separar y se avisa", () => {
    expect(separarNombreCompleto("Ana")).toEqual({ nombres: "Ana", apellidoPaterno: "", apellidoMaterno: null, avisos: ["una_palabra"] });
    expect(separarNombreCompleto("   ").avisos).toEqual(["una_palabra"]);
  });

  it("ordena los espacios de más", () => {
    expect(separarNombreCompleto("  Ana    María   Pérez  Rojas ").nombres).toBe("Ana María");
  });

  it("avisa de un posible apellido compuesto (de la Cruz, del Castillo)", () => {
    expect(separarNombreCompleto("Juan Carlos de la Cruz").avisos).toContain("apellido_compuesto");
    expect(separarNombreCompleto("Rosa del Castillo Vega").avisos).toContain("apellido_compuesto");
  });

  it("no confunde un apellido compuesto con 2 palabras ni marca los nombres normales", () => {
    expect(separarNombreCompleto("Rosa Vega").avisos).toEqual([]);
    expect(separarNombreCompleto("Ana María Pérez Rojas").avisos).toEqual([]);
  });
});

describe("conMayusculaInicial", () => {
  it("un nombre todo en mayúsculas o todo en minúsculas pasa a mayúscula inicial", () => {
    expect(conMayusculaInicial("LUISA GUEIL JORDAN")).toBe("Luisa Gueil Jordan");
    expect(conMayusculaInicial("luisa gueil jordan")).toBe("Luisa Gueil Jordan");
  });

  it("deja en minúscula las partículas que no abren el nombre", () => {
    expect(conMayusculaInicial("ANA DE LA CRUZ")).toBe("Ana de la Cruz");
  });

  it("un nombre que ya mezcla mayúsculas y minúsculas se respeta tal cual", () => {
    expect(conMayusculaInicial("Ana De la Cruz")).toBe("Ana De la Cruz");
    expect(conMayusculaInicial("María José")).toBe("María José");
  });

  it("respeta las tildes y la ñ", () => {
    expect(conMayusculaInicial("NÚÑEZ ÁLVAREZ")).toBe("Núñez Álvarez");
  });

  it("una cadena sin letras queda igual", () => {
    expect(conMayusculaInicial("123")).toBe("123");
  });

  it("el nombre en mayúsculas del Excel se guarda ya con mayúscula inicial", () => {
    expect(separarNombreCompleto("LUISA GUEIL JORDAN LEON")).toEqual({
      nombres: "Luisa Gueil",
      apellidoPaterno: "Jordan",
      apellidoMaterno: "Leon",
      avisos: [],
    });
  });
});
