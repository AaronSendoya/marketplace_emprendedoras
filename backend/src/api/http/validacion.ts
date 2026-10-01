import { z, type ZodError, type ZodType } from "zod";
import { ErrorValidacion, type DetalleError } from "@/shared/domain/errors";
import { LIMITE_CUERPO_JSON, leerConLimite } from "./cuerpo";

// Mensajes de validación en español para toda la API.
z.config(z.locales.es());

export function errorDeValidacion(error: ZodError, raiz = "cuerpo"): ErrorValidacion {
  const detalles = error.issues.flatMap((problema): DetalleError[] => {
    const ruta = problema.path.map(String);
    // Con .strict(), el campo sobrante es el que se quiere señalar (p. ej. `rol`).
    if (problema.code === "unrecognized_keys") {
      return problema.keys.map((clave) => ({ campo: [...ruta, clave].join("."), mensaje: "Campo no permitido." }));
    }
    return [{ campo: ruta.join(".") || raiz, mensaje: problema.message }];
  });
  return new ErrorValidacion(undefined, detalles);
}

function analizar<E extends ZodType>(esquema: E, datos: unknown, raiz: string): z.output<E> {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) throw errorDeValidacion(resultado.error, raiz);
  return resultado.data;
}

// Para datos que no vienen en JSON (los campos de texto de un formulario multipart).
export const validarDatos = analizar;

export async function leerCuerpo<E extends ZodType>(request: Request, esquema: E): Promise<z.output<E>> {
  // Regla 17: el cuerpo se lee con un tope de tamaño antes de interpretarlo.
  const cuerpo = await leerConLimite(request, LIMITE_CUERPO_JSON, "El cuerpo de la petición es demasiado grande.").catch((error: unknown) => {
    if (error instanceof ErrorValidacion) throw new ErrorValidacion("El cuerpo debe ser JSON válido.");
    throw error;
  });
  let crudo: unknown;
  try {
    crudo = JSON.parse(await cuerpo.text());
  } catch {
    throw new ErrorValidacion("El cuerpo debe ser JSON válido.");
  }
  return analizar(esquema, crudo, "cuerpo");
}

export function leerConsulta<E extends ZodType>(request: Request, esquema: E): z.output<E> {
  const parametros = Object.fromEntries(new URL(request.url).searchParams);
  return analizar(esquema, parametros, "consulta");
}

// Parámetros de la ruta (`/usuarios/{id}`): un id con formato inválido se rechaza con 400 antes de
// tocar la base (regla 17).
export function leerParametrosRuta<E extends ZodType>(parametros: unknown, esquema: E): z.output<E> {
  return analizar(esquema, parametros, "ruta");
}
