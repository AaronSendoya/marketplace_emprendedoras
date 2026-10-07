import "server-only";
import { obtenerToken } from "@/lib/auth/sesion";
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

// Lanzado con el error ya traducido: el código para decidir la reacción (ej. reintentar en un
// 429), el mensaje para mostrar tal cual (ya viene en español y sin detalles internos, regla 17
// del backend) y el estado HTTP por si hace falta.
export class ErrorApi extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly codigo: ErrorRespuesta["error"]["codigo"] | "DESCONOCIDO",
    public readonly detalles?: ErrorRespuesta["error"]["detalles"],
    // Segundos hasta poder reintentar (cabecera Retry-After, ej. login con 429 por demasiados
    // intentos, regla 17 backend). undefined cuando la respuesta no la trae.
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
    // El cuerpo no era JSON (ej. el backend ni siquiera respondió): no hay más detalle que dar.
  }
  const retryAfter = respuesta.headers.get("Retry-After");
  return new ErrorApi(
    cuerpo?.error.mensaje ?? `El servidor respondió ${respuesta.status}.`,
    respuesta.status,
    cuerpo?.error.codigo ?? "DESCONOCIDO",
    cuerpo?.error.detalles,
    retryAfter ? Number(retryAfter) : undefined,
  );
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
  const respuesta = await fetch(`${urlBase()}${ruta}${query}`, {
    next: { revalidate: opciones.revalidarSegundos ?? 30 },
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);

  return (await respuesta.json()) as T;
}

// POST tipado (fase 2: login es la primera escritura del frontend hacia el backend). Nunca se
// cachea: cada envío es una petición nueva, no una consulta repetible.
export async function enviarJson<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);

  return (await respuesta.json()) as T;
}

// POST público sin cuerpo de respuesta (ej. registrar un clic de contacto, 204). `enviarJson` no
// sirve acá: `Response.json()` falla si no hay nada que parsear.
export async function enviarJsonSinRespuesta(ruta: string, cuerpo: unknown): Promise<void> {
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);
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
  const respuesta = await fetch(`${urlBase()}${ruta}${query}`, {
    headers: await cabeceraAutenticacion(),
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);

  return (await respuesta.json()) as T;
}

// POST autenticado.
export async function enviarJsonAutenticado<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await cabeceraAutenticacion()) },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);

  return (await respuesta.json()) as T;
}

// PATCH autenticado (ej. activar/desactivar una cuenta).
export async function actualizarJsonAutenticado<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await cabeceraAutenticacion()) },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);

  return (await respuesta.json()) as T;
}

// POST autenticado con `multipart/form-data` (crear un perfil o un producto, ambos con imagen).
// Sin cabecera `Content-Type` explícita: `fetch` la arma solo a partir del `FormData`, con el
// boundary del multipart (ponerla a mano rompe el envío).
export async function enviarFormDataAutenticado<T>(ruta: string, formData: FormData): Promise<T> {
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: "POST",
    headers: await cabeceraAutenticacion(),
    body: formData,
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);

  return (await respuesta.json()) as T;
}

// PUT autenticado con `multipart/form-data` (reemplazar la foto de perfil, el logo o la imagen de
// un producto: cada una es su propia ruta, independiente de los datos de texto).
export async function reemplazarFormDataAutenticado<T>(ruta: string, formData: FormData): Promise<T> {
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: "PUT",
    headers: await cabeceraAutenticacion(),
    body: formData,
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);

  return (await respuesta.json()) as T;
}

// DELETE autenticado (ej. quitar la asignación de un descuento a un producto). El backend responde
// 204 sin cuerpo, así que no hay nada que parsear como JSON.
// DELETE autenticado con cuerpo JSON y respuesta JSON: eliminar una cuenta por completo, cuyo cuerpo lleva el correo escrito por
// el Admin como confirmación (regla 5, backend).
export async function eliminarJsonAutenticado<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...(await cabeceraAutenticacion()) },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);

  return (await respuesta.json()) as T;
}

export async function eliminarAutenticado(ruta: string): Promise<void> {
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: "DELETE",
    headers: await cabeceraAutenticacion(),
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);
}

// GET autenticado de un archivo (ej. la plantilla de ejemplo del Excel de importación): devuelve los bytes tal cual.
export async function obtenerBinarioAutenticado(ruta: string): Promise<ArrayBuffer> {
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    headers: await cabeceraAutenticacion(),
    cache: "no-store",
  });

  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);

  return respuesta.arrayBuffer();
}
