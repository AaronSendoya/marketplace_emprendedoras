import { ZodError } from "zod";
import {
  ErrorDemasiadasSolicitudes,
  ErrorDeDominio,
  type CodigoError,
  type DetalleError,
} from "@/shared/domain/errors";
import type { ILogger } from "@/shared/domain/ILogger";
import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import { esErrorDeNoDisponibilidad } from "./disponibilidad";
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

// Cuánto tarda un reintento razonable cuando la base de datos no está al alcance (segundos).
const REINTENTO_SIN_SERVICIO_SEGUNDOS = 5;
export const MENSAJE_SERVICIO_NO_DISPONIBLE = "El servicio no está disponible por el momento. Inténtalo de nuevo en unos minutos.";

export interface CuerpoError {
  error: { codigo: CodigoError; mensaje: string; detalles?: DetalleError[] };
}

const cuerpoError = (codigo: CodigoError, mensaje: string, detalles?: DetalleError[]): CuerpoError => ({
  error: { codigo, mensaje, ...(detalles?.length ? { detalles } : {}) },
});

export const ok = <T>(cuerpo: T) => Response.json(cuerpo, { status: 200 });

export const creado = <T>(cuerpo: T) => Response.json(cuerpo, { status: 201 });

export const sinContenido = () => new Response(null, { status: 204 });

// `extra`: campos propios de un listado que van junto a `datos` y `paginacion` (ej. `similares` de `GET /perfiles`).
export const paginado = <T>({ datos, total }: Pagina<T>, { pagina, limite }: ParametrosPagina, extra: Record<string, unknown> = {}) =>
  Response.json({ datos, paginacion: { pagina, limite, total }, ...extra });

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

  // La base de datos no está al alcance (conexión rechazada, cortada, agotada): no es un fallo de la aplicación. `503` con `Retry-After`
  // para que el frontend ofrezca reintentar; el motivo real solo queda en el registro.
  if (esErrorDeNoDisponibilidad(conocido)) {
    try {
      logger.warn("servicio_no_disponible", { error });
    } catch {
      // Un fallo del registro nunca debe impedir responder.
    }
    return Response.json(cuerpoError("ERROR_INTERNO", MENSAJE_SERVICIO_NO_DISPONIBLE), {
      status: 503,
      headers: { "Retry-After": String(REINTENTO_SIN_SERVICIO_SEGUNDOS) },
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
