import { describe, expect, it } from "vitest";
import { claveFonetica, costeDeEdicion, diferenciasPermitidas, normalizarTexto, ordenarPorSimilitud, type DocumentoBuscable } from "./BusquedaSimilar";

describe("normalizarTexto", () => {
  it("quita acentos y mayúsculas, y trata la ñ como n (igual que la colación de la base)", () => {
    expect(normalizarTexto("CAFETERÍA Ñandú")).toBe("cafeteria nandu");
  });
});

describe("claveFonetica", () => {
  it.each([
    ["dulses", "dulces"],
    ["dulzes", "dulces"],
    ["baca", "vaca"],
    ["oja", "hoja"],
    ["keso", "queso"],
    ["jente", "gente"],
    ["kasa", "casa"],
    ["poyo", "pollo"],
  ])("%s suena como %s", (a, b) => {
    expect(claveFonetica(a)).toBe(claveFonetica(b));
  });

  it.each([
    ["gato", "jato"],
    ["guerra", "jerra"],
    ["chola", "sola"],
  ])("%s no suena como %s", (a, b) => {
    expect(claveFonetica(a)).not.toBe(claveFonetica(b));
  });
});

describe("diferenciasPermitidas", () => {
  it("ninguna hasta 2 letras, una de 3 a 5 y dos de 6 en adelante", () => {
    expect([1, 2, 3, 5, 6, 12].map((n) => diferenciasPermitidas("a".repeat(n)))).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("los números no se aproximan", () => {
    expect(diferenciasPermitidas("100")).toBe(0);
    expect(diferenciasPermitidas("16gb")).toBe(0);
  });
});

describe("costeDeEdicion", () => {
  it.each([
    ["dulces", "dulces", 0],
    ["dulses", "dulces", 10],
    ["dulce", "dulces", 10],
    ["dulcess", "dulces", 10],
    ["dluces", "dulces", 10],
    ["abc", "xyz", 30],
  ])("%s a %s: %i", (a, b, esperado) => {
    expect(costeDeEdicion(a, b, 30)).toBe(esperado);
  });

  it("una vocal por otra o una tecla por su vecina cuesta menos que una diferencia entera", () => {
    expect(costeDeEdicion("aarun", "aaron", 30)).toBe(6);
    expect(costeDeEdicion("dulxes", "dulces", 30)).toBe(6);
    expect(costeDeEdicion("tazad", "tazas", 30)).toBe(6);
    expect(costeDeEdicion("tezes", "tazas", 30)).toBe(12);
  });

  it("una consonante por otra que no está a su lado en el teclado cuesta una diferencia entera", () => {
    expect(costeDeEdicion("dulpes", "dulces", 30)).toBe(10);
    expect(costeDeEdicion("tazap", "tazas", 30)).toBe(10);
  });

  it("devuelve presupuesto + 1 cuando se pasa, sin calcular el coste exacto", () => {
    expect(costeDeEdicion("dulces", "pastel", 10)).toBe(11);
    expect(costeDeEdicion("a", "abcdefgh", 20)).toBe(21);
  });
});

describe("ordenarPorSimilitud (motor genérico)", () => {
  const documento = (id: string, nombre: string, parches: Partial<DocumentoBuscable> = {}): DocumentoBuscable => ({
    id,
    nombre,
    campos: [{ texto: nombre, relevancia: "principal" }],
    ...parches,
  });

  it("ordena por dónde se encontró la coincidencia: principal, secundario y descripción", () => {
    const enDescripcion = documento("descripcion", "Zeta", { campos: [{ texto: "Hacemos dulces caseros", relevancia: "descripcion" }] });
    const enSecundario = documento("secundario", "Beta", { campos: [{ texto: "Dulces surtidos", relevancia: "secundario" }] });
    const enPrincipal = documento("principal", "Gamma", { campos: [{ texto: "Dulces", relevancia: "principal" }] });

    expect(ordenarPorSimilitud("dulces", [enDescripcion, enSecundario, enPrincipal])).toEqual(["principal", "secundario", "descripcion"]);
  });

  it("ignora los campos vacíos y recorta las descripciones muy largas", () => {
    const larga = documento("larga", "Larga", { campos: [{ texto: `${"relleno ".repeat(60)}mermelada`, relevancia: "descripcion" }] });
    const vacio = documento("vacio", "Vacío", { campos: [{ texto: null, relevancia: "principal" }] });

    expect(ordenarPorSimilitud("mermelada", [larga, vacio])).toEqual([]);
  });

  it("sin documentos o con un texto sin palabras no hay resultados", () => {
    expect(ordenarPorSimilitud("dulces", [])).toEqual([]);
    expect(ordenarPorSimilitud("!!!", [documento("a", "Dulces")])).toEqual([]);
  });
});
