"use server";

import { revalidatePath } from "next/cache";
import { ErrorApi } from "@/lib/api/cliente";
import {
  analizarExcelEmprendedoras,
  descargarPlantillaEmprendedoras,
  importarEmprendedoras,
  validarFilasEmprendedoras,
} from "@/lib/api/importaciones";
import type {
  AnalisisImportacion,
  FilaAValidarImportacion,
  ResultadoFilaImportacion,
  ValidacionFilaImportacion,
} from "@/lib/api/tipos";
import { MENSAJES_IMPORTACION } from "@/lib/importacion/mensajes";

// Importación de emprendedoras desde Excel (regla 22, backend). Las cuatro Server Functions devuelven un resultado en vez de
// lanzar: la pantalla decide qué mostrar según la situación (archivo rechazado, sesión vencida, demasiadas peticiones...).
export interface FalloDeImportacion {
  ok: false;
  error: string;
  // La sesión venció o no es de Admin: seguir no tiene sentido hasta iniciar sesión de nuevo.
  sesionVencida?: boolean;
  // Segundos hasta poder reintentar (429): la pantalla espera y repite sola.
  reintentarEn?: number;
  // El problema es del contenido del archivo (formato, columnas, tamaño): ayuda ver cómo debe verse.
  delArchivo?: boolean;
}

export type RespuestaDeImportacion<T> = ({ ok: true } & T) | FalloDeImportacion;

// Del error al mensaje situacional: el del backend cuando es de validación (ya viene en español y dice qué hacer) y uno propio
// en los demás casos, sin detalles internos.
function fallo(error: unknown): FalloDeImportacion {
  if (error instanceof ErrorApi) {
    if (error.status === 401) return { ok: false, error: MENSAJES_IMPORTACION.sesionVencida, sesionVencida: true };
    if (error.status === 403) return { ok: false, error: MENSAJES_IMPORTACION.sinPermiso, sesionVencida: true };
    if (error.status === 429) {
      const segundos = error.retryAfter && error.retryAfter > 0 ? Math.ceil(error.retryAfter) : 10;
      return { ok: false, error: MENSAJES_IMPORTACION.demasiadasPeticiones(segundos), reintentarEn: segundos };
    }
    if (error.status === 400 || error.status === 413) return { ok: false, error: error.message, delArchivo: true };
  }
  return { ok: false, error: MENSAJES_IMPORTACION.errorDelServidor };
}

// Paso 1 -> 2. Reenvía solo el archivo (el backend rechaza cualquier otro campo) y no guarda nada.
export async function analizarExcelAction(formData: FormData): Promise<RespuestaDeImportacion<{ analisis: AnalisisImportacion }>> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) return { ok: false, error: MENSAJES_IMPORTACION.sinArchivo };

  const envio = new FormData();
  envio.set("archivo", archivo, archivo.name);
  try {
    return { ok: true, analisis: await analizarExcelEmprendedoras(envio) };
  } catch (error) {
    return fallo(error);
  }
}

// Paso 2: vuelve a revisar las filas que el Admin acaba de corregir. No escribe nada.
export async function validarFilasAction(filas: FilaAValidarImportacion[]): Promise<RespuestaDeImportacion<{ filas: ValidacionFilaImportacion[] }>> {
  try {
    return { ok: true, filas: (await validarFilasEmprendedoras(filas)).filas };
  } catch (error) {
    return fallo(error);
  }
}

// Paso 3: una tanda de hasta 10 filas. Las contraseñas temporales salen aquí, una sola vez, y el navegador las ofrece en un CSV.
export async function importarFilasAction(filas: FilaAValidarImportacion[]): Promise<RespuestaDeImportacion<{ resultados: ResultadoFilaImportacion[] }>> {
  try {
    const { resultados } = await importarEmprendedoras(filas);
    if (resultados.some((resultado) => resultado.cuenta_creada)) {
      revalidatePath("/admin");
      revalidatePath("/admin/emprendimientos");
    }
    return { ok: true, resultados };
  } catch (error) {
    return fallo(error);
  }
}

// El `.xlsx` de ejemplo, en base64 para que el navegador lo convierta en una descarga.
export async function descargarPlantillaAction(): Promise<RespuestaDeImportacion<{ base64: string }>> {
  try {
    return { ok: true, base64: Buffer.from(await descargarPlantillaEmprendedoras()).toString("base64") };
  } catch (error) {
    return fallo(error);
  }
}
