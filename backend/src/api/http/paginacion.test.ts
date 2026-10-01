import { describe, expect, it } from "vitest";
import { desplazamiento } from "@/shared/domain/Paginacion";
import { esquemaPaginacion, LIMITE_MAXIMO } from "./paginacion";

describe("esquemaPaginacion", () => {
  it("usa página 1 y límite 20 por defecto", () => {
    expect(esquemaPaginacion.parse({})).toEqual({ pagina: 1, limite: 20 });
  });

  it("convierte los textos de la URL a número", () => {
    expect(esquemaPaginacion.parse({ pagina: "3", limite: "50" })).toEqual({ pagina: 3, limite: 50 });
  });

  it.each([
    ["página 0", { pagina: "0" }],
    ["página negativa", { pagina: "-1" }],
    ["página decimal", { pagina: "1.5" }],
    ["límite 0", { limite: "0" }],
    [`límite mayor a ${LIMITE_MAXIMO}`, { limite: String(LIMITE_MAXIMO + 1) }],
    ["texto no numérico", { limite: "abc" }],
  ])("rechaza %s", (_caso, consulta) => {
    expect(esquemaPaginacion.safeParse(consulta).success).toBe(false);
  });
});

describe("desplazamiento", () => {
  it("la primera página no salta filas", () => {
    expect(desplazamiento({ pagina: 1, limite: 20 })).toBe(0);
  });

  it("salta las filas de las páginas anteriores", () => {
    expect(desplazamiento({ pagina: 3, limite: 20 })).toBe(40);
  });
});
