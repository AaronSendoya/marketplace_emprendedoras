import { ZodError } from "zod";
import {
  ErrorDemasiadasSolicitudes,
  ErrorDeDominio,
  type CodigoError,
  type DetalleError,
} from "@/shared/domain/errors";
import type { ILogger } from "@/shared/domain/ILogger";
import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import { errorDeValidacion } from "./validacion";

export const ESTADO_HTTP: Record<CodigoError, number> = {
  VALIDACION: 400,
  NO_AUTENTICADO: 401,
  PROHIBIDO: 403,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  ARCHIVO_MUY_GRANDE: 413,
  DEMASIADAS_SOLICITUDES: 429,
  ERROR_INTERNO: 500,
};

export interface CuerpoError {
  error: { codigo: CodigoError; mensaje: string; detalles?: DetalleError[] };
}

const cuerpoError = (codigo: CodigoError, mensaje: string, detalles?: DetalleError[]): CuerpoError => ({
  error: { codigo, mensaje, ...(detalles?.length ? { detalles } : {}) },
});

export const ok = <T>(cuerpo: T) => Response.json(cuerpo, { status: 200 });

export const creado = <T>(cuerpo: T) => Response.json(cuerpo, { status: 201 });

export const sinContenido = () => new Response(null, { status: 204 });

export const paginado = <T>({ datos, total }: Pagina<T>, { pagina, limite }: ParametrosPagina) =>
  Response.json({ datos, paginacion: { pagina, limite, total } });

// Nunca devuelve detalles internos: un error desconocido se registra y responde 500 genérico.
export function respuestaDeError(error: unknown, logger: ILogger): Response {
  const conocido = error instanceof ZodError ? errorDeValidacion(error) : error;

  if (conocido instanceof ErrorDeDominio) {
    const reintento = conocido instanceof ErrorDemasiadasSolicitudes ? conocido.reintentarEnSegundos : undefined;
    return Response.json(cuerpoError(conocido.codigo, conocido.message, conocido.detalles), {
      status: ESTADO_HTTP[conocido.codigo],
      headers: reintento === undefined ? undefined : { "Retry-After": String(reintento) },
    });
  }

  try {
    logger.error("error_no_controlado", { error });
  } catch {
    // Un fallo del registro nunca debe impedir responder.
  }
  return Response.json(cuerpoError("ERROR_INTERNO", "Error interno del servidor."), {
    status: ESTADO_HTTP.ERROR_INTERNO,
  });
}
