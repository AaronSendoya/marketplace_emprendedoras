"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { clasesBoton, type VarianteBoton } from "@/components/atoms/Button";
import { mensajeDeFallo, type ResultadoDeAccion } from "@/lib/errores/clasificar";
import { useTrampaDeFoco } from "@/lib/hooks/useTrampaDeFoco";

interface PropsConfirmModal {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  textoConfirmar: string;
  variante?: VarianteBoton;
  onCerrar: () => void;
  // Si devuelve `{ error }` (o lanza), el modal se queda abierto y lo dice: nunca tira la pantalla entera a un error crítico.
  onConfirmar: () => Promise<void | ResultadoDeAccion>;
}

// Confirmación genérica antes de una mutación (activar/desactivar una cuenta, por ahora). Mismo
// patrón de accesibilidad que ModalBienvenida (foco al abrir, Escape y clic afuera cierran, bloquea
// el scroll) pero con dos botones y un estado de "guardando", porque acá sí dispara una escritura.
export function ConfirmModal({ abierto, titulo, descripcion, textoConfirmar, variante = "primario", onCerrar, onConfirmar }: PropsConfirmModal) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Cerrar por cualquier vía (Cancelar, Escape, clic afuera) limpia el aviso: al volver a abrir no queda el de la vez anterior.
  const cerrar = () => {
    setError(null);
    onCerrar();
  };

  const dialogoRef = useRef<HTMLDivElement>(null);
  useTrampaDeFoco(dialogoRef, abierto);

  useEffect(() => {
    if (!abierto) return;
    cancelarRef.current?.focus();
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

  function confirmar() {
    // Server Action fuera de un <form>: si redirige (ej. sesión vencida a mitad de la acción),
    // Next lo resuelve igual; si no, hay que cerrar el modal a mano al terminar.
    setError(null);
    iniciarTransicion(async () => {
      try {
        const resultado = await onConfirmar();
        if (resultado && typeof resultado === "object" && resultado.error) {
          setError(resultado.error);
          return;
        }
      } catch (fallo) {
        setError(mensajeDeFallo(fallo));
        return;
      }
      onCerrar();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={cerrar}>
      <div
        role="alertdialog"
        aria-modal="true"
        ref={dialogoRef}
        tabIndex={-1}
        aria-labelledby="confirmar-titulo"
        aria-describedby="confirmar-descripcion"
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
      >
        <h2 id="confirmar-titulo" className="font-titulo text-lg font-bold text-texto">
          {titulo}
        </h2>
        <p id="confirmar-descripcion" className="font-cuerpo text-sm text-texto-secundario">
          {descripcion}
        </p>
        {error && (
          <p role="alert" className="rounded-md border border-error-borde bg-error-suave px-3 py-2 font-cuerpo text-sm text-texto">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button ref={cancelarRef} type="button" onClick={cerrar} disabled={pendiente} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
            Cancelar
          </button>
          <button type="button" onClick={confirmar} disabled={pendiente} className={clasesBoton(variante, "min-h-11 lg:min-h-0")}>
            {pendiente ? "Guardando…" : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
