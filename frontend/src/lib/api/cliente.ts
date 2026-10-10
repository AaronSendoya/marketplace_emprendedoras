import "server-only";
import { clasificarError, MENSAJES_DE_ERROR } from "@/lib/errores/clasificar";
import { obtenerToken } from "@/lib/auth/sesion";
import { mensajeDeError } from "./mensajeError";
import type { ErrorRespuesta } from "./tipos";

// Solo se llama desde Server Components y rutas del propio frontend: BACKEND_URL nunca lleva el
// prefijo NEXT_PUBLIC_, así que no existe en el bundle del navegador (regla 1, backend: el
// frontend es quien habla con la API, no el visitante directamente). `server-only` hace que
// Next falle en el build si algún Client Component llegara a importar este archivo.
function urlBase(): string {
  const url = process.env.BACKEND_URL;
  if (!url) throw new Error("Falta BACKEND_URL en .env.local (referencia: .env.example).");
  return url;
}

// Cuánto se espera al backend antes de rendirse. Sin un tope, un backend que acepta la conexión y no responde (la base de datos
// detenida, el proceso trabado) dejaba cada página esperando hasta los 5 minutos que tiene `fetch` por defecto, y las peticiones se
// acumulaban en el servidor del frontend. Al vencer, `fetch` falla con un `TimeoutError`, que se traduce a `ErrorApi` con el código
// `TIEMPO_AGOTADO`, y la página muestra su pantalla de error (`app/error.tsx`), igual que con el backend caído. Las subidas de archivos
// (imágenes de hasta 5 MB, el Excel de la importación) necesitan más: se procesan y se convierten a WebP en el servidor.
const TIEMPO_CONSULTA_MS = 15_000;
const TIEMPO_ARCHIVOS_MS = 60_000;
// Una tanda de la importación con imágenes de Drive: el backend descarga y procesa hasta 10 archivos de hasta 20 MB (regla 22).
// Queda por debajo de los 100 s que Cloudflare espera antes de cortar la conexión.
export const TIEMPO_IMPORTACION_CON_IMAGENES_MS = 90_000;
// La comprobación de hasta 25 filas consulta en Drive los metadatos de hasta 50 archivos, de 4 en 4.
export const TIEMPO_VERIFICACION_IMAGENES_MS = 30_000;

// Lo que el cliente HTTP agrega a los códigos del backend: fallos que ocurren antes de tener una respuesta (o con una respuesta
// que no se puede leer). El resto del frontend los trata como cualquier `ErrorApi`.
export type CodigoErrorApi = ErrorRespuesta["error"]["codigo"] | "DESCONOCIDO" | "SIN_CONEXION" | "TIEMPO_AGOTADO" | "RESPUESTA_INVALIDA";

// Lanzado con el error ya traducido: el código para decidir la reacción (ej. reintentar en un
// 429), el mensaje para mostrar tal cual (ya viene en español y sin detalles internos, regla 17
// del backend) y el estado HTTP por si hace falta (0 si ni siquiera hubo respuesta).
export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly codigo: CodigoErrorApi,
    public readonly detalles?: ErrorRespuesta["error"]["detalles"],
    // Segundos hasta poder reintentar (cabecera Retry-After, ej. login con 429 por demasiados
    // intentos, regla 17 backend; o un 503 con la base de datos fuera de alcance). undefined cuando la respuesta no la trae.
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ErrorApi";
  }
}

async function errorDesdeRespuesta(respuesta: Response): Promise<ErrorApi> {
  let cuerpo: ErrorRespuesta | undefined;
  try {
    cuerpo = (await respuesta.json()) as ErrorRespuesta;
  } catch {
    // El cuerpo no era JSON (ej. una página de error HTML de un proxy delante del backend): no hay más detalle que dar.
  }
  const retryAfter = respuesta.headers.get("Retry-After");
  const mensajeDelBackend = typeof cuerpo?.error?.mensaje === "string" ? cuerpo.error.mensaje : undefined;
  return new ErrorApi(
    // Un 400 de validación con el mensaje general se muestra con el motivo exacto de cada campo (ver mensajeError.ts). Sin cuerpo
    // legible, un texto propio según el estado (nunca «El servidor respondió 502.»).
    mensajeDelBackend === undefined && !cuerpo?.error?.detalles?.length
      ? clasificarError({ status: respuesta.status }).mensaje
      : mensajeDeError(mensajeDelBackend, cuerpo?.error?.detalles, respuesta.status),
    respuesta.status,
    cuerpo?.error?.codigo ?? "DESCONOCIDO",
    cuerpo?.error?.detalles,
    retryAfter && Number.isFinite(Number(retryAfter)) ? Number(retryAfter) : undefined,
  );
}

// Un `fetch` que falla antes de tener respuesta: sin red, backend apagado o tiempo agotado. Se traduce para que las pantallas y las
// acciones lo traten como cualquier otro error del backend (y nunca muestren el mensaje técnico de Node).
function errorDeRed(error: unknown): ErrorApi {
  const { categoria } = clasificarError(error);
  if (categoria === "tiempo_agotado") return new ErrorApi(MENSAJES_DE_ERROR.tiempo_agotado, 0, "TIEMPO_AGOTADO");
  return new ErrorApi(MENSAJES_DE_ERROR.sin_conexion, 0, "SIN_CONEXION");
}

// La única salida al backend: pone el tiempo máximo, traduce los fallos de red y las respuestas con error.
async function pedir(ruta: string, init: RequestInit & { next?: { revalidate: number | false } }, tiempoMs: number): Promise<Response> {
  const url = `${urlBase()}${ruta}`;
  let respuesta: Response;
  try {
    respuesta = await fetch(url, { ...init, signal: AbortSignal.timeout(tiempoMs) });
  } catch (error) {
    throw errorDeRed(error);
  }
  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);
  return respuesta;
}

// Una respuesta 2xx cuyo cuerpo no es JSON (un proxy que devolvió HTML con 200, un corte a mitad): se trata como un fallo del
// servidor, no como un `SyntaxError` suelto.
async function leerJson<T>(respuesta: Response): Promise<T> {
  try {
    return (await respuesta.json()) as T;
  } catch {
    throw new ErrorApi(MENSAJES_DE_ERROR.servidor, respuesta.status, "RESPUESTA_INVALIDA");
  }
}

function aQueryString(parametros: Record<string, string | number | undefined>): string {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined) busqueda.set(clave, String(valor));
  }
  const texto = busqueda.toString();
  return texto ? `?${texto}` : "";
}

export interface OpcionesGet {
  parametros?: Record<string, string | number | undefined>;
  // Next cachea un fetch por defecto; el feed público no debe quedar más tiempo del tolerable
  // sin refrescar (regla 8, backend: la vigencia de los descuentos se evalúa al consultar).
  revalidarSegundos?: number | false;
}

// GET tipado, con caché controlada por revalidarSegundos.
export async function obtenerJson<T>(ruta: string, opciones: OpcionesGet = {}): Promise<T> {
  const query = aQueryString(opciones.parametros ?? {});
  const respuesta = await pedir(`${ruta}${query}`, { next: { revalidate: opciones.revalidarSegundos ?? 30 } }, TIEMPO_CONSULTA_MS);
  return leerJson<T>(respuesta);
}

// POST tipado (fase 2: login es la primera escritura del frontend hacia el backend). Nunca se
// cachea: cada envío es una petición nueva, no una consulta repetible.
export async function enviarJson<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await pedir(
    ruta,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo), cache: "no-store" },
    TIEMPO_CONSULTA_MS,
  );
  return leerJson<T>(respuesta);
}

// POST público sin cuerpo de respuesta (ej. registrar un clic de contacto, 204). `enviarJson` no
// sirve acá: `Response.json()` falla si no hay nada que parsear.
export async function enviarJsonSinRespuesta(ruta: string, cuerpo: unknown): Promise<void> {
  await pedir(
    ruta,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo), cache: "no-store" },
    TIEMPO_CONSULTA_MS,
  );
}

// Cabecera Authorization: Bearer desde la cookie de sesión (regla 5: el navegador nunca ve el
// JWT, pero el servidor del frontend sí, para reenviarlo). Llamar a esto sin sesión es un error
// de programación (la ruta debería estar protegida por un layout guard, ej. app/admin/layout.tsx)
// y no un caso de usuario a manejar con gracia.
async function cabeceraAutenticacion(): Promise<HeadersInit> {
  const token = await obtenerToken();
  if (!token) throw new Error("Se llamó a una ruta autenticada sin sesión activa.");
  return { Authorization: `Bearer ${token}` };
}

// GET autenticado. Nunca se cachea (mismo criterio que el backend con Cache-Control: no-store en
// /admin/*, /mis/*, etc.): los datos son por usuario, cachearlos filtraría entre sesiones.
export async function obtenerJsonAutenticado<T>(ruta: string, opciones: OpcionesGet = {}): Promise<T> {
  const query = aQueryString(opciones.parametros ?? {});
  const respuesta = await pedir(`${ruta}${query}`, { headers: await cabeceraAutenticacion(), cache: "no-store" }, TIEMPO_CONSULTA_MS);
  return leerJson<T>(respuesta);
}

export interface OpcionesEnvio {
  // Cabeceras extra (ej. `X-Google-Access-Token`, regla 17). Nunca se registran: este módulo no escribe en ningún registro.
  cabeceras?: Record<string, string>;
  // Tiempo máximo de espera; por defecto, el de una consulta.
  tiempoMs?: number;
}

// POST autenticado.
export async function enviarJsonAutenticado<T>(ruta: string, cuerpo: unknown, opciones: OpcionesEnvio = {}): Promise<T> {
  const respuesta = await pedir(
    ruta,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...opciones.cabeceras, ...(await cabeceraAutenticacion()) },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    },
    opciones.tiempoMs ?? TIEMPO_CONSULTA_MS,
  );
  return leerJson<T>(respuesta);
}

// POST autenticado sin cuerpo de envío ni de respuesta (204): ej. cerrar sesión en el servidor (regla 5, backend).
export async function enviarSinRespuestaAutenticado(ruta: string): Promise<void> {
  await pedir(ruta, { method: "POST", headers: await cabeceraAutenticacion(), cache: "no-store" }, TIEMPO_CONSULTA_MS);
}

// PATCH autenticado (ej. activar/desactivar una cuenta).
export async function actualizarJsonAutenticado<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await pedir(
    ruta,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await cabeceraAutenticacion()) },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    },
    TIEMPO_CONSULTA_MS,
  );
  return leerJson<T>(respuesta);
}

// POST autenticado con `multipart/form-data` (crear un perfil o un producto, ambos con imagen).
// Sin cabecera `Content-Type` explícita: `fetch` la arma solo a partir del `FormData`, con el
// boundary del multipart (ponerla a mano rompe el envío).
export async function enviarFormDataAutenticado<T>(ruta: string, formData: FormData): Promise<T> {
  const respuesta = await pedir(ruta, { method: "POST", headers: await cabeceraAutenticacion(), body: formData, cache: "no-store" }, TIEMPO_ARCHIVOS_MS);
  return leerJson<T>(respuesta);
}

// PUT autenticado con `multipart/form-data` (reemplazar la foto de perfil, el logo o la imagen de
// un producto: cada una es su propia ruta, independiente de los datos de texto).
export async function reemplazarFormDataAutenticado<T>(ruta: string, formData: FormData): Promise<T> {
  const respuesta = await pedir(ruta, { method: "PUT", headers: await cabeceraAutenticacion(), body: formData, cache: "no-store" }, TIEMPO_ARCHIVOS_MS);
  return leerJson<T>(respuesta);
}

// DELETE autenticado con cuerpo JSON y respuesta JSON: eliminar una cuenta por completo, cuyo cuerpo lleva el correo escrito por
// el Admin como confirmación (regla 5, backend).
export async function eliminarJsonAutenticado<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await pedir(
    ruta,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(await cabeceraAutenticacion()) },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    },
    TIEMPO_CONSULTA_MS,
  );
  return leerJson<T>(respuesta);
}

// DELETE autenticado (ej. quitar la asignación de un descuento a un producto). El backend responde 204 sin cuerpo, así que no hay
// nada que parsear como JSON.
export async function eliminarAutenticado(ruta: string): Promise<void> {
  await pedir(ruta, { method: "DELETE", headers: await cabeceraAutenticacion(), cache: "no-store" }, TIEMPO_CONSULTA_MS);
}

// GET autenticado de un archivo (ej. la plantilla de ejemplo del Excel de importación): devuelve los bytes tal cual.
export async function obtenerBinarioAutenticado(ruta: string): Promise<ArrayBuffer> {
  const respuesta = await pedir(ruta, { headers: await cabeceraAutenticacion(), cache: "no-store" }, TIEMPO_ARCHIVOS_MS);
  try {
    return await respuesta.arrayBuffer();
  } catch {
    throw new ErrorApi(MENSAJES_DE_ERROR.servidor, respuesta.status, "RESPUESTA_INVALIDA");
  }
}
