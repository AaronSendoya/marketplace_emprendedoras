"use client";

import { WifiOff } from "lucide-react";
import { useEffect } from "react";
import { reportarError } from "@/lib/errores/reportar";
import { useEnLinea } from "@/lib/errores/useEnLinea";

// Ruido que no es un fallo de la aplicación: lo que dicen los navegadores y las extensiones, no el sitio.
const IGNORAR = [/ResizeObserver loop/i, /^Script error\.?$/i, /chrome-extension:\/\//i, /moz-extension:\/\//i, /safari-extension:\/\//i];

const esRuido = (texto: string) => IGNORAR.some((patron) => patron.test(texto));

// Vigila lo que ninguna pantalla atrapó (un error de un script, una promesa rechazada sin manejar) y lo manda al registro del
// servidor, y avisa cuando el navegador se queda sin internet. No dibuja nada salvo el aviso de conexión, y ese no es una pantalla
// de error: la persona sigue donde estaba.
export function MonitorDeErrores() {
  const enLinea = useEnLinea();

  useEffect(() => {
    function alErrorDeVentana(evento: ErrorEvent) {
      // Un recurso que no carga (una imagen) dispara `error` en su elemento, no aquí; y ya tiene su propio marcador.
      if (!evento.error && esRuido(evento.message ?? "")) return;
      const mensaje = evento.error instanceof Error ? evento.error.message : (evento.message ?? "");
      if (esRuido(mensaje) || esRuido(evento.filename ?? "")) return;
      reportarError("ventana", evento.error ?? mensaje, "window.onerror");
    }

    function alRechazoSinManejar(evento: PromiseRejectionEvent) {
      const razon: unknown = evento.reason;
      const mensaje = razon instanceof Error ? razon.message : typeof razon === "string" ? razon : "";
      if (esRuido(mensaje)) return;
      reportarError("promesa", razon ?? "Promesa rechazada sin motivo", "unhandledrejection");
    }

    window.addEventListener("error", alErrorDeVentana);
    window.addEventListener("unhandledrejection", alRechazoSinManejar);
    return () => {
      window.removeEventListener("error", alErrorDeVentana);
      window.removeEventListener("unhandledrejection", alRechazoSinManejar);
    };
  }, []);

  if (enLinea) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex justify-center px-4">
      <p
        role="status"
        className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-lg border border-borde-fuerte bg-superficie px-4 py-2.5 font-cuerpo text-sm text-texto"
      >
        <WifiOff size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-aviso" />
        <span>Sin conexión a internet. Lo que hagas no se guardará hasta que vuelva.</span>
      </p>
    </div>
  );
}
