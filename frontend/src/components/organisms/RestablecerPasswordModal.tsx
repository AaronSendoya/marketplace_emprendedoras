"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button, clasesBoton } from "@/components/atoms/Button";
import { ContrasenaTemporal } from "@/components/molecules/ContrasenaTemporal";
import { CampoPassword } from "@/components/molecules/CampoPassword";
import { restablecerPasswordAction, type EstadoRestablecerPassword } from "@/lib/admin/acciones";
import { useTrampaDeFoco } from "@/lib/hooks/useTrampaDeFoco";
import { useEnvioSinReinicio } from "@/lib/hooks/useEnvioSinReinicio";

const ESTADO_INICIAL: EstadoRestablecerPassword = {};

const CLASES_LABEL = "font-cuerpo text-sm font-medium text-texto";

interface PropsRestablecerPasswordModal {
  usuarioId: string;
  abierto: boolean;
  onCerrar: () => void;
}

// El Admin restablece la contraseña de cualquier cuenta sin OTP (regla 5 y 15: el OTP es solo
// para que la propia Emprendedora se recupere). Mismo patrón de accesibilidad que ConfirmModal.
export function RestablecerPasswordModal({ usuarioId, abierto, onCerrar }: PropsRestablecerPasswordModal) {
  const { estado, alEnviar, pendiente } = useEnvioSinReinicio(restablecerPasswordAction.bind(null, usuarioId), ESTADO_INICIAL);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  const dialogoRef = useRef<HTMLDivElement>(null);
  useTrampaDeFoco(dialogoRef, abierto);

  useEffect(() => {
    if (!abierto) return;
    cerrarRef.current?.focus();
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  if (estado.resultado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={onCerrar}>
        <div
          role="dialog"
          aria-modal="true"
          ref={dialogoRef}
          tabIndex={-1}
          aria-labelledby="password-lista-titulo"
          onClick={(evento) => evento.stopPropagation()}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
        >
          <h2 id="password-lista-titulo" className="font-titulo text-lg font-bold text-texto">
            Contraseña restablecida
          </h2>

          {estado.resultado.passwordTemporal ? (
            <div className="space-y-1 rounded-md bg-enfasis-suave p-3">
              <p className="font-cuerpo text-xs font-medium text-enfasis">
                Contraseña temporal — se muestra una sola vez, cópiala ahora:
              </p>
              <ContrasenaTemporal valor={estado.resultado.passwordTemporal} />
            </div>
          ) : (
            <p className="font-cuerpo text-sm text-texto-secundario">
              La cuenta ya puede iniciar sesión con la contraseña nueva que definiste.
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={onCerrar} className="min-h-11 lg:min-h-0">
              Listo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        ref={dialogoRef}
        tabIndex={-1}
        aria-labelledby="restablecer-password-titulo"
        aria-describedby="restablecer-password-descripcion"
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
      >
        <h2 id="restablecer-password-titulo" className="font-titulo text-lg font-bold text-texto">
          Restablecer la contraseña de esta cuenta
        </h2>
        <p id="restablecer-password-descripcion" className="font-cuerpo text-sm text-texto-secundario">
          Se cambia de inmediato, sin pedirle ningún código a la cuenta, y cierra las sesiones abiertas que tenga.
          Podés escribir una contraseña nueva o dejar el campo vacío para que el sistema genere una temporal.
        </p>

        <form onSubmit={alEnviar} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor={`password-${usuarioId}`} className={CLASES_LABEL}>
              Contraseña nueva (opcional)
            </label>
            <CampoPassword id={`password-${usuarioId}`} name="password" autoComplete="new-password" minLength={8} disabled={pendiente} />
          </div>

          {estado.error && (
            <p role="alert" className="flex items-center gap-2 font-cuerpo text-sm text-texto">
              <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
              {estado.error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button ref={cerrarRef} type="button" onClick={onCerrar} disabled={pendiente} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
              Cancelar
            </button>
            <Button type="submit" variante="peligro" disabled={pendiente} className="min-h-11 lg:min-h-0">
              {pendiente ? "Restableciendo la contraseña…" : "Restablecer la contraseña"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
