import { extendZodWithOpenApi, type OpenAPIRegistry, type ResponseConfig } from "@asteasolutions/zod-to-openapi";
import { z, type ZodType } from "zod";
import { ESTADO_HTTP } from "@/api/http/respuestas";
import { CODIGOS_ERROR, type CodigoError } from "@/shared/domain/errors";

// Necesario para registry.register(); los esquemas se nombran con .meta({ id }).
extendZodWithOpenApi(z);

// Requisitos de seguridad para `security` de cada ruta. Toda ruta declara uno de los dos:
// así el test de contrato del paso 15 puede exigirlo.
export const PUBLICO: [] = [];
export const AUTENTICADO = [{ bearerAuth: [] }];

export const EsquemaError = z
  .object({
    error: z.object({
      codigo: z.enum(CODIGOS_ERROR).meta({ example: "NO_ENCONTRADO" }),
      mensaje: z.string().meta({ example: "Recurso no encontrado." }),
      detalles: z
        .array(z.object({ campo: z.string().meta({ example: "email" }), mensaje: z.string() }))
        .optional()
        .meta({ description: "Solo en errores de validación y conflictos: un elemento por campo afectado." }),
    }),
  })
  .meta({ id: "Error", description: "Formato único de error de la API." });

export const EsquemaPaginacion = z
  .object({
    pagina: z.number().int().meta({ example: 1 }),
    limite: z.number().int().meta({ example: 20 }),
    total: z.number().int().meta({ description: "Total de elementos que cumplen el filtro.", example: 135 }),
  })
  .meta({ id: "Paginacion" });

// Respuesta paginada de un listado: `{ datos, paginacion }`.
export const esquemaPagina = <T extends ZodType>(item: T, id: string) =>
  z.object({ datos: z.array(item), paginacion: EsquemaPaginacion }).meta({ id });

const DESCRIPCION_ERROR: Record<CodigoError, string> = {
  VALIDACION: "Datos inválidos.",
  NO_AUTENTICADO: "Falta el token o no es válido.",
  PROHIBIDO: "No tienes permiso para esta acción.",
  NO_ENCONTRADO: "El recurso no existe.",
  CONFLICTO: "La operación entra en conflicto con el estado actual.",
  ARCHIVO_MUY_GRANDE: "El archivo supera el tamaño permitido.",
  DEMASIADAS_SOLICITUDES: "Demasiadas solicitudes; revisa la cabecera Retry-After.",
  ERROR_INTERNO: "Error interno del servidor.",
};

// Las respuestas de error de una ruta se piden por código: el estado HTTP sale de la misma
// tabla que usa `respuestaDeError`, así la documentación no puede desviarse del comportamiento.
export function respuestasDeError(...codigos: CodigoError[]): Record<string, ResponseConfig> {
  return Object.fromEntries(
    codigos.map((codigo) => [
      String(ESTADO_HTTP[codigo]),
      { description: DESCRIPCION_ERROR[codigo], content: { "application/json": { schema: EsquemaError } } },
    ]),
  );
}

export function registrarComponentes(registro: OpenAPIRegistry): void {
  registro.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Token de POST /auth/login. En Swagger: botón Authorize, pegar solo el token (sin 'Bearer').",
  });
  registro.register("Error", EsquemaError);
  registro.register("Paginacion", EsquemaPaginacion);
}
