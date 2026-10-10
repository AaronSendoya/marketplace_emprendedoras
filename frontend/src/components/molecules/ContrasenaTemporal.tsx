"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CLASES_FOCO_CONTROL } from "@/lib/estilos";

type EstadoCopia = "pendiente" | "copiada" | "fallo";

// La contraseña temporal de una cuenta (regla 5, backend): se muestra una sola vez, así que copiarla tiene que ser fácil y a prueba
// de errores. Un clic en el texto la selecciona entera (`select-all`) y el botón la manda al portapapeles; si el navegador no deja
// (página sin HTTPS, permiso denegado), lo dice para que se copie a mano. El aviso va en una región `status` para lectores de pantalla.
export function ContrasenaTemporal({ valor }: { valor: string }) {
  const [estado, setEstado] = useState<EstadoCopia>("pendiente");
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setEstado("copiada");
    } catch {
      setEstado("fallo");
    }
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setEstado("pendiente"), 3000);
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-superficie px-2 py-1 font-titulo text-base font-bold break-all text-texto select-all">{valor}</code>
        <button
          type="button"
          onClick={copiar}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border border-borde bg-superficie px-3 font-cuerpo text-sm font-medium text-texto transition-colors hover:bg-fondo ${CLASES_FOCO_CONTROL}`}
        >
          {estado === "copiada" ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : <Copy size={16} strokeWidth={1.75} aria-hidden="true" />}
          {estado === "copiada" ? "Copiada" : "Copiar"}
        </button>
      </div>
      <p role="status" className="font-cuerpo text-xs text-texto-secundario">
        {estado === "copiada" && "Contraseña copiada al portapapeles."}
        {estado === "fallo" && "No se pudo copiar: selecciona la contraseña y cópiala a mano."}
      </p>
    </div>
  );
}
