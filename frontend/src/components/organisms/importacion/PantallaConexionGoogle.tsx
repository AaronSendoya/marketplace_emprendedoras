"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useEffect } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { CANAL_DE_CONEXION_GOOGLE, MOTIVOS_DE_FALLO, type MotivoDeFallo } from "@/lib/google/oauth";

interface PropsPantalla {
  conectada: boolean;
  motivo: MotivoDeFallo;
}

const MILISEGUNDOS_ANTES_DE_CERRAR = 1500;

// La pantalla a la que termina la ventana de «Conectar cuenta de Google» (reglas 17 y 22). Avisa a la página del importador por un
// canal del mismo navegador y, si salió bien, se cierra sola; si no, se queda para que se lea el motivo. El aviso no lleva ningún
// dato: la página del importador vuelve a preguntar al servidor, que es quien lee la cookie.
export function PantallaConexionGoogle({ conectada, motivo }: PropsPantalla) {
  useEffect(() => {
    let canal: BroadcastChannel | null = null;
    try {
      canal = new BroadcastChannel(CANAL_DE_CONEXION_GOOGLE);
      canal.postMessage(conectada ? { estado: "ok" } : { estado: "error", motivo });
    } catch {
      // Sin BroadcastChannel (navegador muy antiguo): el importador se actualiza al volver a esa pestaña.
    } finally {
      canal?.close();
    }
    if (!conectada) return;
    const temporizador = window.setTimeout(() => window.close(), MILISEGUNDOS_ANTES_DE_CERRAR);
    return () => window.clearTimeout(temporizador);
  }, [conectada, motivo]);

  return (
    <main className="tema-admin flex min-h-screen items-center justify-center bg-fondo p-6">
      <section className="w-full max-w-md space-y-4 rounded-lg border border-borde bg-superficie p-6 text-center" role="status" aria-live="polite">
        {conectada ? (
          <CircleCheck size={40} strokeWidth={1.75} aria-hidden="true" className="mx-auto text-salvia" />
        ) : (
          <CircleX size={40} strokeWidth={1.75} aria-hidden="true" className="mx-auto text-error" />
        )}
        <h1 className="font-titulo text-xl font-bold text-texto">{conectada ? "Cuenta de Google conectada" : "No se pudo conectar la cuenta"}</h1>
        <p className="font-cuerpo text-sm text-texto-secundario">
          {conectada
            ? "Ya puedes volver al importador: las fotos y los logos de Drive se cargarán con esta cuenta. Esta ventana se cierra sola."
            : MOTIVOS_DE_FALLO[motivo]}
        </p>
        <button type="button" onClick={() => window.close()} className={clasesBoton(conectada ? "secundario" : "primario", "min-h-11")}>
          Cerrar esta ventana
        </button>
        <p className="font-cuerpo text-xs text-texto-secundario">Si no se cierra, ciérrala tú y vuelve a la pestaña del importador.</p>
      </section>
    </main>
  );
}
