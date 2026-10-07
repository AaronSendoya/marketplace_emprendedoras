import { describe, expect, it } from "vitest";
import { MAXIMO_DE_TERMINOS_DE_BUSQUEDA, terminosDeBusqueda } from "./BusquedaTexto";

describe("terminosDeBusqueda (reglas 20 y 21)", () => {
  it("separa el texto en palabras", () => {
    expect(terminosDeBusqueda("dulces de prueba")).toEqual(["dulces", "de", "prueba"]);
  });

  it("una sola palabra es una sola condición", () => {
    expect(terminosDeBusqueda("café")).toEqual(["café"]);
  });

  it("ignora los espacios de más, al principio, al final y entre palabras", () => {
    expect(terminosDeBusqueda("  dulces    prueba  ")).toEqual(["dulces", "prueba"]);
  });

  it("separa también con tabuladores, saltos de línea y el espacio no separable de un teclado móvil", () => {
    expect(terminosDeBusqueda("uno\tdos\ntres cuatro")).toEqual(["uno", "dos", "tres", "cuatro"]);
  });

  it("un texto de solo espacios no tiene palabras", () => {
    expect(terminosDeBusqueda("   ")).toEqual([]);
    expect(terminosDeBusqueda("")).toEqual([]);
  });

  it("conserva la forma de cada palabra: los acentos, las mayúsculas y los comodines no se tocan aquí", () => {
    expect(terminosDeBusqueda("CAFETERÍA 100% a_b")).toEqual(["CAFETERÍA", "100%", "a_b"]);
  });

  it("se queda con las primeras palabras cuando hay más del máximo", () => {
    const texto = Array.from({ length: MAXIMO_DE_TERMINOS_DE_BUSQUEDA + 4 }, (_, i) => `p${i}`).join(" ");
    const terminos = terminosDeBusqueda(texto);

    expect(terminos).toHaveLength(MAXIMO_DE_TERMINOS_DE_BUSQUEDA);
    expect(terminos[0]).toBe("p0");
    expect(terminos[MAXIMO_DE_TERMINOS_DE_BUSQUEDA - 1]).toBe(`p${MAXIMO_DE_TERMINOS_DE_BUSQUEDA - 1}`);
  });

  it("el máximo es de seis palabras", () => {
    expect(MAXIMO_DE_TERMINOS_DE_BUSQUEDA).toBe(6);
  });
});
