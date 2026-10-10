// Sistema de control de errores del frontend (2026-10-10). Sin imports: lo usan el servidor y el navegador, y lo prueba
// `clasificar.test.ts` con el corredor de Node.
//
// Una sola pregunta: «¿qué clase de problema es y qué le decimos a la persona?». Las acciones (Server Functions) lo usan para
// devolver un mensaje en español sin detalles internos (regla 17, backend), y las pantallas de error para decidir qué ofrecer. Los
// errores críticos (la página no se puede mostrar) llevan a una pantalla de respaldo; el resto se resuelve en el lugar (un aviso, un
// marcador, un mensaje del formulario) sin sacar a la persona de lo que estaba haciendo.

export type CategoriaDeError =
  // El servidor del frontend no pudo hablar con el backend (apagado, sin red) o el navegador no tiene internet.
  | "sin_conexion"
  | "tiempo_agotado"
  // El backend respondió 503: su base de datos no está al alcance. Pasa solo y suele resolverse en minutos.
  | "servicio_no_disponible"
  | "sesion_vencida"
  | "sin_permiso"
  | "no_encontrado"
  | "conflicto"
  | "validacion"
  | "demasiadas_peticiones"
  | "servidor"
  | "desconocido";

export interface ErrorClasificado {
  categoria: CategoriaDeError;
  // Texto para mostrar tal cual: en español, sin detalles internos.
  mensaje: string;
  // Volver a intentarlo puede resolverlo (sin pedir nada distinto a la persona).
  reintentable: boolean;
  // Si pasa al cargar una página, la página no se puede mostrar: pantalla de respaldo.
  critico: boolean;
  status: number | null;
  // Segundos que pide esperar el servidor (429 y 503).
  esperarSegundos: number | null;
}

export const MENSAJES_DE_ERROR: Record<CategoriaDeError, string> = {
  sin_conexion: "No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  tiempo_agotado: "El servidor tardó demasiado en responder. Inténtalo de nuevo en un momento.",
  servicio_no_disponible: "El servicio no está disponible por el momento. Inténtalo de nuevo en unos minutos.",
  sesion_vencida: "Tu sesión venció. Inicia sesión de nuevo para continuar.",
  sin_permiso: "No tienes permiso para hacer esto.",
  no_encontrado: "Eso ya no existe o cambió de lugar.",
  conflicto: "Eso cambió mientras lo hacías. Actualiza la página e inténtalo de nuevo.",
  validacion: "Los datos enviados no son válidos. Revísalos e inténtalo de nuevo.",
  demasiadas_peticiones: "Hay demasiadas peticiones seguidas. Espera unos segundos e inténtalo de nuevo.",
  servidor: "Ocurrió un error en el servidor. Inténtalo de nuevo en un momento.",
  desconocido: "Ocurrió un error inesperado. Inténtalo de nuevo.",
};

const CRITICOS: ReadonlySet<CategoriaDeError> = new Set(["sin_conexion", "tiempo_agotado", "servicio_no_disponible", "servidor", "desconocido"]);
const REINTENTABLES: ReadonlySet<CategoriaDeError> = new Set([
  "sin_conexion",
  "tiempo_agotado",
  "servicio_no_disponible",
  "demasiadas_peticiones",
  "servidor",
  "desconocido",
]);
// Para estas, el mensaje que trae el backend ya es el correcto (en español y pensado para la persona): se respeta tal cual.
const CON_MENSAJE_PROPIO: ReadonlySet<CategoriaDeError> = new Set(["validacion", "conflicto", "sin_permiso", "no_encontrado"]);

// Códigos de red que dejan los clientes HTTP de Node (`undici`) cuando no llegan al otro lado.
const CODIGOS_DE_RED = new Set(["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN", "EHOSTUNREACH", "ENETUNREACH", "EPIPE", "UND_ERR_SOCKET", "UND_ERR_CONNECT_TIMEOUT"]);

interface ConForma {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  codigo?: unknown;
  retryAfter?: unknown;
  code?: unknown;
  cause?: unknown;
}

const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");

function tieneCodigoDeRed(error: ConForma, profundidad = 0): boolean {
  if (profundidad > 3) return false;
  if (typeof error.code === "string" && CODIGOS_DE_RED.has(error.code)) return true;
  const causa = error.cause;
  return typeof causa === "object" && causa !== null && tieneCodigoDeRed(causa as ConForma, profundidad + 1);
}

function categoriaDe(error: ConForma): CategoriaDeError {
  const estado = typeof error.status === "number" ? error.status : null;
  const codigo = texto(error.codigo);

  if (codigo === "SIN_CONEXION") return "sin_conexion";
  if (codigo === "TIEMPO_AGOTADO") return "tiempo_agotado";
  if (codigo === "RESPUESTA_INVALIDA") return "servidor";

  if (estado !== null && estado > 0) {
    if (estado === 401) return "sesion_vencida";
    if (estado === 403) return "sin_permiso";
    if (estado === 404) return "no_encontrado";
    if (estado === 409) return "conflicto";
    if (estado === 400 || estado === 413 || estado === 422) return "validacion";
    if (estado === 429) return "demasiadas_peticiones";
    if (estado === 503) return "servicio_no_disponible";
    if (estado === 504) return "tiempo_agotado";
    if (estado >= 500) return "servidor";
    return "desconocido";
  }

  const nombre = texto(error.name);
  if (nombre === "TimeoutError" || nombre === "AbortError") return "tiempo_agotado";
  if (tieneCodigoDeRed(error)) return "sin_conexion";
  // `fetch` de Node y de los navegadores lanza un `TypeError` («fetch failed», «Failed to fetch», «Load failed») sin red.
  if (nombre === "TypeError" && /fetch|network|load failed/i.test(texto(error.message))) return "sin_conexion";
  return "desconocido";
}

// Acepta cualquier cosa que alguien haya lanzado. `ErrorApi` (lib/api/cliente.ts) se reconoce por su forma y no por su clase, para que
// este módulo no dependa de código que solo corre en el servidor.
export function clasificarError(error: unknown): ErrorClasificado {
  const forma: ConForma = typeof error === "object" && error !== null ? (error as ConForma) : {};
  const categoria = categoriaDe(forma);
  const propio = texto(forma.message).trim();
  const mensaje = CON_MENSAJE_PROPIO.has(categoria) && propio !== "" ? propio : MENSAJES_DE_ERROR[categoria];
  const retryAfter = typeof forma.retryAfter === "number" && Number.isFinite(forma.retryAfter) && forma.retryAfter > 0 ? Math.ceil(forma.retryAfter) : null;
  return {
    categoria,
    mensaje,
    reintentable: REINTENTABLES.has(categoria),
    critico: CRITICOS.has(categoria),
    status: typeof forma.status === "number" && forma.status > 0 ? forma.status : null,
    esperarSegundos: retryAfter,
  };
}

// Lo que devuelve una acción (Server Function) sin formulario —activar un producto, asignar un descuento—: `error` vacío es que salió
// bien. Es un valor y no una excepción a propósito: una excepción de una Server Function llega al navegador sin su mensaje (Next lo
// esconde en producción) y, sin atrapar, tira la pantalla entera al error crítico.
export interface ResultadoDeAccion {
  error?: string;
}

// Atajos para quien solo necesita el texto o el «¿hay que mandarlo a iniciar sesión?».
export const mensajeDeFallo = (error: unknown): string => clasificarError(error).mensaje;
export const esSesionVencida = (error: unknown): boolean => clasificarError(error).categoria === "sesion_vencida";
