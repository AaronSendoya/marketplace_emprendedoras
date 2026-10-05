"use client";

import { CircleAlert } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Button, clasesBoton } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { editarCuentaAction, type EstadoEditarCuenta } from "@/lib/admin/acciones";
import type { Usuario } from "@/lib/api/tipos";

const ESTADO_INICIAL: EstadoEditarCuenta = {};

const CLASES_LABEL = "font-cuerpo text-sm font-medium text-texto";

interface PropsEditarCuentaModal {
  usuario: Usuario;
  abierto: boolean;
  onCerrar: () => void;
}

// Editar nombres, apellidos y correo sin OTP (regla 5 y 15). Mismo patrón de accesibilidad que
// ConfirmModal/ModalBienvenida (foco al abrir, Escape y clic afuera cierran), pero con un
// formulario de verdad en vez de solo confirmar/cancelar.
export function EditarCuentaModal({ usuario, abierto, onCerrar }: PropsEditarCuentaModal) {
  const [estado, accion, pendiente] = useActionState(editarCuentaAction.bind(null, usuario.id), ESTADO_INICIAL);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (estado.guardado) onCerrar();
  }, [estado.guardado, onCerrar]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-cuenta-titulo"
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
      >
        <h2 id="editar-cuenta-titulo" className="font-titulo text-lg font-bold text-texto">
          Editar los datos de la cuenta
        </h2>

        <form action={accion} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor={`email-${usuario.id}`} className={CLASES_LABEL}>
              Correo electrónico
            </label>
            <Input id={`email-${usuario.id}`} name="email" type="email" defaultValue={usuario.email} required disabled={pendiente} />
          </div>

          <div className="space-y-1">
            <label htmlFor={`nombres-${usuario.id}`} className={CLASES_LABEL}>
              Nombres
            </label>
            <Input id={`nombres-${usuario.id}`} name="nombres" defaultValue={usuario.nombres} required disabled={pendiente} />
          </div>

          <div className="space-y-1">
            <label htmlFor={`apellido_paterno-${usuario.id}`} className={CLASES_LABEL}>
              Apellido paterno
            </label>
            <Input
              id={`apellido_paterno-${usuario.id}`}
              name="apellido_paterno"
              defaultValue={usuario.apellido_paterno}
              required
              disabled={pendiente}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor={`apellido_materno-${usuario.id}`} className={CLASES_LABEL}>
              Apellido materno (opcional)
            </label>
            <Input
              id={`apellido_materno-${usuario.id}`}
              name="apellido_materno"
              defaultValue={usuario.apellido_materno ?? ""}
              disabled={pendiente}
            />
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
            <Button type="submit" disabled={pendiente} className="min-h-11 lg:min-h-0">
              {pendiente ? "Guardando los cambios…" : "Guardar los cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
