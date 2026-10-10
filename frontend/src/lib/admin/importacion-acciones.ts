"use server";

import { revalidatePath } from "next/cache";
import { ErrorApi } from "@/lib/api/cliente";
import {
  analizarExcelEmprendedoras,
  descargarPlantillaEmprendedoras,
  importarEmprendedoras,
  obtenerEstadoGoogle,
  validarFilasEmprendedoras,
  verificarImagenesEmprendedoras,
} from "@/lib/api/importaciones";
import type {
  AnalisisImportacion,
  FilaAValidarImportacion,
  FilaAVerificarImagenes,
  FilaImagenesVerificadas,
  ResultadoFilaImportacion,
  ValidacionFilaImportacion,
} from "@/lib/api/tipos";
import { clasificarError } from "@/lib/errores/clasificar";
import { registrarErrorDelServidor } from "@/lib/errores/registro";
import { borrarConexionGoogle, leerConexionGoogle } from "@/lib/google/cookies";
import { MENSAJES_IMPORTACION } from "@/lib/importacion/mensajes";

// Importación de emprendedoras desde Excel (regla 22, backend). Las Server Functions devuelven un resultado en vez de lanzar: la
// pantalla decide qué mostrar según la situación (archivo rechazado, sesión vencida, demasiadas peticiones...).
export interface FalloDeImportacion {
  ok: false;
  error: string;
  // La sesión venció o no es de Admin: seguir no tiene sentido hasta iniciar sesión de nuevo.
  sesionVencida?: boolean;
  // Segundos hasta poder reintentar (429): la pantalla espera y repite sola.
  reintentarEn?: number;
  // El problema es del contenido del archivo (formato, columnas, tamaño): ayuda ver cómo debe verse.
  delArchivo?: boolean;
  // Google rechazó el token de la cuenta conectada (venció, o la persona revocó el permiso): hay que conectar de nuevo. Lo ya
  // creado se conserva.
  conexionVencida?: boolean;
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
    // Un detalle en el campo `google` (regla 17): el token que mandamos ya no sirve. Quien llama borra la cookie para que la
    // pantalla vea la cuenta como desconectada.
    if ((error.status === 409 || error.status === 400) && error.detalles?.some((detalle) => detalle.campo === "google")) {
      return { ok: false, error: MENSAJES_IMPORTACION.conexionVencida, conexionVencida: true };
    }
    if (error.status === 400 || error.status === 413) return { ok: false, error: error.message, delArchivo: true };
  }
  // Lo demás es un fallo del sistema: queda en el registro (sin datos personales) y se le dice a la persona qué pasa, con las
  // palabras de siempre (sin conexión, tiempo agotado, servicio no disponible) o el genérico.
  registrarErrorDelServidor("importacion", error);
  const { categoria, mensaje } = clasificarError(error);
  if (categoria === "sin_conexion" || categoria === "tiempo_agotado" || categoria === "servicio_no_disponible") return { ok: false, error: mensaje };
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

// Paso 3: una tanda de hasta 10 filas (5 con la cuenta de Google conectada, que descarga las imágenes de Drive). Las contraseñas
// temporales salen aquí, una sola vez, y el navegador las ofrece en un CSV. El token de Google sale de su cookie `httpOnly` y se
// reenvía al backend; la página nunca lo ve.
export async function importarFilasAction(filas: FilaAValidarImportacion[]): Promise<RespuestaDeImportacion<{ resultados: ResultadoFilaImportacion[] }>> {
  try {
    const conexion = await leerConexionGoogle();
    const { resultados } = await importarEmprendedoras(filas, conexion?.token ?? null);
    if (resultados.some((resultado) => resultado.cuenta_creada)) {
      revalidatePath("/admin");
      revalidatePath("/admin/emprendimientos");
    }
    return { ok: true, resultados };
  } catch (error) {
    const resultado = fallo(error);
    if (resultado.conexionVencida) await borrarConexionGoogle();
    return resultado;
  }
}

// Paso 2: comprueba en Drive (sin descargar) la foto y el logo de hasta 25 filas con la cuenta conectada. Un problema de un
// archivo es una advertencia de su fila, nunca un fallo de esta función.
export async function verificarImagenesAction(
  filas: FilaAVerificarImagenes[],
): Promise<RespuestaDeImportacion<{ conexion: "ok" | "sin_conexion" | "vencida"; cuenta: string | null; filas: FilaImagenesVerificadas[] }>> {
  try {
    const conexion = await leerConexionGoogle();
    const verificacion = await verificarImagenesEmprendedoras(filas, conexion?.token ?? null);
    if (verificacion.conexion === "vencida") await borrarConexionGoogle();
    return { ok: true, conexion: verificacion.conexion, cuenta: verificacion.cuenta ?? conexion?.cuenta ?? null, filas: verificacion.filas };
  } catch (error) {
    return fallo(error);
  }
}

// Qué ve el paso 1 de la cuenta de Google: si el servidor la tiene configurada y si hay una cuenta conectada (la cookie).
export async function estadoGoogleAction(): Promise<RespuestaDeImportacion<{ disponible: boolean; conectada: boolean; cuenta: string | null }>> {
  try {
    const { disponible } = await obtenerEstadoGoogle();
    const conexion = disponible ? await leerConexionGoogle() : null;
    return { ok: true, disponible, conectada: conexion !== null, cuenta: conexion?.cuenta ?? null };
  } catch (error) {
    return fallo(error);
  }
}

// «Desconectar»: borra las cookies. El token no se guarda en ningún otro lado y vence solo en una hora.
export async function desconectarGoogleAction(): Promise<{ ok: true }> {
  await borrarConexionGoogle();
  return { ok: true };
}

// El `.xlsx` de ejemplo, en base64 para que el navegador lo convierta en una descarga.
export async function descargarPlantillaAction(): Promise<RespuestaDeImportacion<{ base64: string }>> {
  try {
    return { ok: true, base64: Buffer.from(await descargarPlantillaEmprendedoras()).toString("base64") };
  } catch (error) {
    return fallo(error);
  }
}
