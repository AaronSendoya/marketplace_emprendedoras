import "server-only";
import { clasificarError } from "./clasificar";
import { redactar, type ReporteDeError } from "./reporte";

// El registro de errores del servidor del frontend: una línea JSON por evento en la salida estándar (donde la recoge el hosting),
// con el mismo criterio que el backend (`ILogger`): nunca correos, contraseñas, tokens ni cuerpos de peticiones. Todo texto pasa por
// `redactar`. Es la única vía por la que un error atrapado (y por eso invisible) deja rastro.
function escribir(nivel: "error" | "warn", evento: string, datos: Record<string, unknown>) {
  try {
    const linea = JSON.stringify({ nivel, evento, fecha: new Date().toISOString(), ...datos });
    (nivel === "error" ? console.error : console.warn)(linea);
  } catch {
    // Registrar nunca debe romper la petición.
  }
}

// Un error atrapado en una acción o en un cargador de datos. `contexto` dice dónde («crearCuentaAction»).
export function registrarErrorDelServidor(contexto: string, error: unknown): void {
  const clasificado = clasificarError(error);
  const forma = typeof error === "object" && error !== null ? (error as { message?: unknown; codigo?: unknown; name?: unknown }) : {};
  escribir(clasificado.critico ? "error" : "warn", "error_frontend", {
    contexto: redactar(contexto, 80),
    categoria: clasificado.categoria,
    estado: clasificado.status,
    codigo: typeof forma.codigo === "string" ? redactar(forma.codigo, 40) : null,
    tipo: typeof forma.name === "string" ? redactar(forma.name, 40) : typeof error,
    mensaje: typeof forma.message === "string" ? redactar(forma.message) : null,
  });
}

// Un reporte que llegó del navegador (ya pasado por `sanitizarReporte`).
export function registrarErrorDelCliente(reporte: ReporteDeError): void {
  escribir("error", "error_cliente", { ...reporte });
}
