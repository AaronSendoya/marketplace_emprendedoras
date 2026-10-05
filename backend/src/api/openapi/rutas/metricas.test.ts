import { describe, expect, it } from "vitest";
import { EsquemaMapaCalorQuery, EsquemaRangoQuery, EsquemaRankingQuery, EsquemaRegistrarClicBody } from "./metricas";

describe("EsquemaRegistrarClicBody (regla 19)", () => {
  it("acepta whatsapp o instagram", () => {
    expect(EsquemaRegistrarClicBody.safeParse({ tipo: "whatsapp" }).success).toBe(true);
    expect(EsquemaRegistrarClicBody.safeParse({ tipo: "instagram" }).success).toBe(true);
  });

  it("rechaza cualquier otro tipo y campos extra", () => {
    expect(EsquemaRegistrarClicBody.safeParse({ tipo: "facebook" }).success).toBe(false);
    expect(EsquemaRegistrarClicBody.safeParse({}).success).toBe(false);
    expect(EsquemaRegistrarClicBody.safeParse({ tipo: "whatsapp", ip: "1.2.3.4" }).success).toBe(false);
  });
});

describe("EsquemaRankingQuery", () => {
  it("por defecto trae 10 y acepta hasta 20", () => {
    expect(EsquemaRankingQuery.parse({})).toEqual({ limite: 10 });
    expect(EsquemaRankingQuery.parse({ limite: "20" })).toEqual({ limite: 20 });
  });

  it("rechaza un límite mayor a 20 o menor a 1", () => {
    expect(EsquemaRankingQuery.safeParse({ limite: "21" }).success).toBe(false);
    expect(EsquemaRankingQuery.safeParse({ limite: "0" }).success).toBe(false);
  });

  it("acepta desde/hasta junto con el límite", () => {
    expect(EsquemaRankingQuery.parse({ desde: "2026-09-01", hasta: "2026-10-01" })).toEqual({
      desde: "2026-09-01",
      hasta: "2026-10-01",
      limite: 10,
    });
  });
});

describe("EsquemaRangoQuery", () => {
  it("sin desde ni hasta, los dos quedan indefinidos", () => {
    expect(EsquemaRangoQuery.parse({})).toEqual({});
  });

  it("acepta fechas con formato YYYY-MM-DD", () => {
    expect(EsquemaRangoQuery.parse({ desde: "2026-09-01", hasta: "2026-10-01" })).toEqual({
      desde: "2026-09-01",
      hasta: "2026-10-01",
    });
  });

  it("rechaza un formato de fecha inválido", () => {
    expect(EsquemaRangoQuery.safeParse({ desde: "01-09-2026" }).success).toBe(false);
    expect(EsquemaRangoQuery.safeParse({ hasta: "2026/10/01" }).success).toBe(false);
  });
});

describe("EsquemaMapaCalorQuery", () => {
  it("por defecto trae 10 cuentas ordenadas por total", () => {
    expect(EsquemaMapaCalorQuery.parse({})).toEqual({ limite: 10, orden: "total" });
  });

  it("acepta orden por whatsapp o instagram junto con el límite y las fechas", () => {
    expect(EsquemaMapaCalorQuery.parse({ orden: "whatsapp", limite: "20", desde: "2026-09-01", hasta: "2026-10-01" })).toEqual({
      orden: "whatsapp",
      limite: 20,
      desde: "2026-09-01",
      hasta: "2026-10-01",
    });
    expect(EsquemaMapaCalorQuery.parse({ orden: "instagram" }).orden).toBe("instagram");
  });

  it("rechaza un orden desconocido y el mismo tope de límite que el ranking", () => {
    expect(EsquemaMapaCalorQuery.safeParse({ orden: "facebook" }).success).toBe(false);
    expect(EsquemaMapaCalorQuery.safeParse({ orden: "total; DROP TABLE usuarios" }).success).toBe(false);
    expect(EsquemaMapaCalorQuery.safeParse({ limite: "21" }).success).toBe(false);
  });
});
