"use client";

import { claveDeReporte, MAX_BYTES_DE_REPORTE, sanitizarReporte, type OrigenDeReporte } from "./reporte";

// Manda al servidor del frontend (`/api/errores`) un error que ocurrió en el navegador, para que quede en su registro: un error de
// React o de un script solo se ve en la consola de quien lo sufre, y de otro modo nadie se entera. Nunca lanza ni espera: reportar no
// puede romper nada más.
//
// Lo que sale: origen, contexto, mensaje y pila ya pasados por `redactar` (sin correos, tokens ni identificadores), el digest de Next
// y la ruta sin consulta. El mismo error no se manda dos veces, y una pantalla que falla en bucle manda pocos.
const RUTA_DE_REPORTES = "/api/errores";
const MAXIMO_POR_PAGINA = 8;

const enviados = new Set<string>();

export function reportarError(origen: OrigenDeReporte, error: unknown, contexto = ""): void {
  if (typeof window === "undefined" || enviados.size >= MAXIMO_POR_PAGINA) return;
  try {
    const forma = typeof error === "object" && error !== null ? (error as { message?: unknown; stack?: unknown; digest?: unknown }) : {};
    const reporte = sanitizarReporte({
      origen,
      contexto,
      mensaje: typeof forma.message === "string" && forma.message !== "" ? forma.message : typeof error === "string" ? error : "Error sin mensaje",
      digest: forma.digest,
      ruta: window.location.pathname,
      pila: forma.stack,
    });
    if (!reporte) return;
    const clave = claveDeReporte(reporte);
    if (enviados.has(clave)) return;
    enviados.add(clave);

    const cuerpo = JSON.stringify(reporte);
    if (cuerpo.length > MAX_BYTES_DE_REPORTE) return;
    const enviado = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(RUTA_DE_REPORTES, new Blob([cuerpo], { type: "application/json" }));
    if (!enviado) {
      void fetch(RUTA_DE_REPORTES, { method: "POST", headers: { "Content-Type": "application/json" }, body: cuerpo, keepalive: true }).catch(() => {});
    }
  } catch {
    // Reportar nunca debe ser la causa de otro error.
  }
}
