import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { PUBLICO, respuestasDeError } from "../componentes";

const EsquemaCiudad = z
  .object({
    id: z.string().meta({ example: "0f7d3b6a-1111-4a2b-8c3d-9e0f1a2b3c4d" }),
    nombre: z.string().meta({ example: "La Paz" }),
  })
  .meta({ id: "Ciudad" });

const EsquemaRubro = z
  .object({
    id: z.string().meta({ example: "0f7d3b6a-2222-4a2b-8c3d-9e0f1a2b3c4d" }),
    nombre: z.string().meta({ example: "Alimentos y bebidas" }),
  })
  .meta({ id: "Rubro" });

export function registrarCatalogos(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/catalogos/ciudades",
    tags: ["Catálogos"],
    summary: "Ciudades",
    description: "Catálogo de ciudades, para los filtros del feed y el alta de un perfil. Orden alfabético.",
    security: PUBLICO,
    responses: {
      200: { description: "Lista de ciudades.", content: { "application/json": { schema: z.array(EsquemaCiudad) } } },
      ...respuestasDeError("ERROR_INTERNO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/catalogos/rubros",
    tags: ["Catálogos"],
    summary: "Rubros",
    description: "Catálogo de rubros, para los filtros del feed y el alta de un perfil. Orden alfabético.",
    security: PUBLICO,
    responses: {
      200: { description: "Lista de rubros.", content: { "application/json": { schema: z.array(EsquemaRubro) } } },
      ...respuestasDeError("ERROR_INTERNO"),
    },
  });
}
