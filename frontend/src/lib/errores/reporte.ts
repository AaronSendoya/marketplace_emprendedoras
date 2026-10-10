// Reporte de errores del navegador al servidor del frontend (2026-10-10). Sin imports: lo usa la ruta `/api/errores`, el cliente que
// reporta y el registro del servidor, y lo prueba `reporte.test.ts` con el corredor de Node.
//
// Un reporte llega de un navegador cualquiera, así que se trata como entrada hostil: tamaño acotado, origen de una lista cerrada y todo
// texto pasa por `redactar`, que quita lo que identifica a una persona (correos, tokens, identificadores) antes de escribirlo en el
// registro del servidor. No se guarda nada más: sin cuerpo de peticiones, sin cookies, sin datos de formularios.

export const ORIGENES_DE_REPORTE = ["pagina", "panel", "raiz", "seccion", "ventana", "promesa", "accion"] as const;
export type OrigenDeReporte = (typeof ORIGENES_DE_REPORTE)[number];

export interface ReporteDeError {
  origen: OrigenDeReporte;
  // Qué se rompió: nombre de la sección, de la acción o de la clase del error. Corto.
  contexto: string;
  mensaje: string;
  // El identificador que Next le pone a un error del servidor (permite cruzarlo con el registro del servidor).
  digest: string | null;
  // Solo la ruta, sin consulta ni identificadores: `/admin/emprendimientos/:id`.
  ruta: string;
  pila: string | null;
}

const MAX_MENSAJE = 300;
const MAX_CONTEXTO = 60;
const MAX_PILA = 1500;
const MAX_RUTA = 160;
export const MAX_BYTES_DE_REPORTE = 8 * 1024;

// Lo que identifica a una persona o da acceso: se reemplaza por una marca. El orden importa (primero lo más específico).
const PATRONES: ReadonlyArray<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [token]"],
  [/\bya29\.[A-Za-z0-9._-]+/g, "[token]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, "[token]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, "[correo]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]"],
  [/\b[A-Za-z0-9_-]{32,}\b/g, "[secreto]"],
  // Teléfonos largos (WhatsApp de Bolivia con prefijo: 591 + 8 dígitos).
  [/\b\+?\d{9,}\b/g, "[número]"],
];

export function redactar(texto: string, maximo = MAX_MENSAJE): string {
  let limpio = texto;
  for (const [patron, marca] of PATRONES) limpio = limpio.replace(patron, marca);
  // Sin saltos de línea ni caracteres de control: una línea del registro es un evento (evita inyectar líneas falsas).
  limpio = limpio.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1)}…` : limpio;
}

// `/admin/emprendimientos/0f7d…?q=ana#x` -> `/admin/emprendimientos/:id`. Nunca la consulta ni el fragmento: pueden llevar búsquedas
// de personas.
export function rutaSinDatos(valor: unknown): string {
  if (typeof valor !== "string") return "/";
  const sinConsulta = valor.split(/[?#]/)[0] ?? "";
  const camino = sinConsulta.startsWith("/") ? sinConsulta : `/${sinConsulta}`;
  const limpio = camino
    .split("/")
    .map((tramo) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tramo) || /^\d{4,}$/.test(tramo) ? ":id" : tramo))
    .join("/");
  return limpio.replace(/[\u0000-\u001f\u007f]+/g, "").slice(0, MAX_RUTA) || "/";
}

const esTexto = (valor: unknown): valor is string => typeof valor === "string";

// De lo que llegó por la red al reporte que se escribe en el registro; `null` si no tiene la forma (se descarta, sin error).
export function sanitizarReporte(entrada: unknown): ReporteDeError | null {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) return null;
  const crudo = entrada as Record<string, unknown>;
  const origen = ORIGENES_DE_REPORTE.find((valido) => valido === crudo.origen);
  if (!origen || !esTexto(crudo.mensaje)) return null;
  const digest = esTexto(crudo.digest) && /^[A-Za-z0-9_-]{1,40}$/.test(crudo.digest) ? crudo.digest : null;
  return {
    origen,
    contexto: esTexto(crudo.contexto) ? redactar(crudo.contexto, MAX_CONTEXTO) : "",
    mensaje: redactar(crudo.mensaje),
    digest,
    ruta: rutaSinDatos(crudo.ruta),
    pila: esTexto(crudo.pila) && crudo.pila !== "" ? redactar(crudo.pila, MAX_PILA) : null,
  };
}

// Un reporte repetido (la misma pantalla que falla en cada reintento) no se vuelve a mandar: la clave junta lo que lo hace «el mismo».
export const claveDeReporte = (reporte: Pick<ReporteDeError, "origen" | "contexto" | "mensaje" | "digest" | "ruta">) =>
  `${reporte.origen}|${reporte.contexto}|${reporte.digest ?? reporte.mensaje}|${reporte.ruta}`;
