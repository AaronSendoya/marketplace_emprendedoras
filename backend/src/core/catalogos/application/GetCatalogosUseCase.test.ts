import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Ciudad } from "../domain/Ciudad";
import type { ICatalogoRepository } from "../domain/ICatalogoRepository";
import type { Rubro } from "../domain/Rubro";
import { GetCatalogosUseCase } from "./GetCatalogosUseCase";

const ciudad = (nombre: string): Ciudad => ({ id: randomUUID(), nombre });
const rubro = (nombre: string): Rubro => ({ id: randomUUID(), nombre });

describe("GetCatalogosUseCase", () => {
  it("devuelve las ciudades del repositorio, tal cual", async () => {
    const ciudades = [ciudad("Cochabamba"), ciudad("La Paz")];
    const repositorio: ICatalogoRepository = { listarCiudades: async () => ciudades, listarRubros: async () => [] };

    await expect(new GetCatalogosUseCase(repositorio).ciudades()).resolves.toBe(ciudades);
  });

  it("devuelve los rubros del repositorio, tal cual", async () => {
    const rubros = [rubro("Otros")];
    const repositorio: ICatalogoRepository = { listarCiudades: async () => [], listarRubros: async () => rubros };

    await expect(new GetCatalogosUseCase(repositorio).rubros()).resolves.toBe(rubros);
  });
});
