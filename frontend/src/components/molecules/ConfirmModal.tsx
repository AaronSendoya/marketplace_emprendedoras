"use client";

import { useEffect, useRef, useTransition } from "react";
import { clasesBoton, type VarianteBoton } from "@/components/atoms/Button";

interface PropsConfirmModal {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  textoConfirmar: string;
  variante?: VarianteBoton;
  onCerrar: () => void;
  onConfirmar: () => Promise<void>;
}

// Confirmación genérica antes de una mutación (activar/desactivar una cuenta, por ahora). Mismo
// patrón de accesibilidad que ModalBienvenida (foco al abrir, Escape y clic afuera cierran, bloquea
// el scroll) pero con dos botones y un estado de "guardando", porque acá sí dispara una escritura.
export function ConfirmModal({ abierto, titulo, descripcion, textoConfirmar, variante = "primario", onCerrar, onConfirmar }: PropsConfirmModal) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const [pendiente, iniciarTransicion] = useTransition();

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
    iniciarTransicion(async () => {
      await onConfirmar();
      onCerrar();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={onCerrar}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        aria-describedby="confirmar-descripcion"
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[calc(100vh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
      >
        <h2 id="confirmar-titulo" className="font-titulo text-lg font-bold text-texto">
          {titulo}
        </h2>
        <p id="confirmar-descripcion" className="font-cuerpo text-sm text-texto-secundario">
          {descripcion}
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button ref={cancelarRef} type="button" onClick={onCerrar} disabled={pendiente} className={clasesBoton("secundario")}>
            Cancelar
          </button>
          <button type="button" onClick={confirmar} disabled={pendiente} className={clasesBoton(variante)}>
            {pendiente ? "Guardando…" : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
