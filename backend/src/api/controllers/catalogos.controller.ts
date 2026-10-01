import { ok } from "@/api/http/respuestas";
import type { GetCatalogosUseCase } from "@/core/catalogos/application/GetCatalogosUseCase";

export async function obtenerCiudades(usecase: GetCatalogosUseCase): Promise<Response> {
  return ok(await usecase.ciudades());
}

export async function obtenerRubros(usecase: GetCatalogosUseCase): Promise<Response> {
  return ok(await usecase.rubros());
}
