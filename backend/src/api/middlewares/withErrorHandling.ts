import type { ILogger } from "@/shared/domain/ILogger";
import { logger } from "@/shared/infrastructure/logger";
import { respuestaDeError } from "@/api/http/respuestas";

type Manejador<C> = (request: Request, contexto: C) => Response | Promise<Response>;

// Envuelve un Route Handler: cualquier error (de dominio, de Zod o desconocido) sale como la
// respuesta estándar, sin filtrar detalles internos.
export function withErrorHandling<C = unknown>(manejador: Manejador<C>, registro: ILogger = logger) {
  return async (request: Request, contexto: C): Promise<Response> => {
    try {
      return await manejador(request, contexto);
    } catch (error) {
      return respuestaDeError(error, registro);
    }
  };
}
