import { describe, expect, it } from "vitest";
import type { GetCatalogosUseCase } from "@/core/catalogos/application/GetCatalogosUseCase";
import { obtenerCiudades, obtenerRubros } from "./catalogos.controller";

describe("obtenerCiudades", () => {
  it("responde 200 con la lista de ciudades del caso de uso", async () => {
    const usecase = { ciudades: async () => [{ id: "1", nombre: "La Paz" }] } as unknown as GetCatalogosUseCase;

    const respuesta = await obtenerCiudades(usecase);

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual([{ id: "1", nombre: "La Paz" }]);
  });
});

describe("obtenerRubros", () => {
  it("responde 200 con la lista de rubros del caso de uso", async () => {
    const usecase = { rubros: async () => [{ id: "2", nombre: "Otros" }] } as unknown as GetCatalogosUseCase;

    const respuesta = await obtenerRubros(usecase);

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual([{ id: "2", nombre: "Otros" }]);
  });
});
