import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { PUBLICO, respuestasDeError } from "../componentes";

export const EsquemaHealth = z
  .object({
    estado: z.literal("ok"),
    base_de_datos: z.literal("ok"),
  })
  .meta({ id: "Health" });

export function registrarHealth(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/health",
    tags: ["Sistema"],
    summary: "Estado del servicio",
    description: "Comprueba que el servicio responde y que la base de datos es alcanzable (`SELECT 1`).",
    security: PUBLICO,
    responses: {
      200: { description: "Servicio y base de datos operativos.", content: { "application/json": { schema: EsquemaHealth } } },
      ...respuestasDeError("ERROR_INTERNO"),
    },
  });
}
