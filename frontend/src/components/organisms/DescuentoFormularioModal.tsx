"use client";

import { CircleAlert } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Button, clasesBoton } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { crearDescuentoAction, editarDescuentoAction, type EstadoFormularioDescuento } from "@/lib/admin/descuentos-acciones";
import type { Descuento } from "@/lib/api/tipos";
import { fechaParaInputLaPaz } from "@/lib/formato/fecha";

interface PropsDescuentoFormularioModal {
  perfilId: string;
  usuarioId: string;
  descuento: Descuento | null;
  abierto: boolean;
  onCerrar: () => void;
}

const CLASES_LABEL = "font-cuerpo text-sm font-medium text-texto";
const ESTADO_INICIAL: EstadoFormularioDescuento = {};

// Un solo modal para alta y edición. Regla 8 (backend): las fechas son opcionales e independientes
// — sin inicio rige desde que se crea, sin fin es permanente — y un descuento no se borra, se
// termina editando `fecha_fin`, así que este mismo formulario sirve para eso.
export function DescuentoFormularioModal({ perfilId, usuarioId, descuento, abierto, onCerrar }: PropsDescuentoFormularioModal) {
  const accionCrear = crearDescuentoAction.bind(null, perfilId, usuarioId);
  const accionEditar = editarDescuentoAction.bind(null, descuento?.id ?? "", usuarioId);
  const [estado, accion, pendiente] = useActionState(descuento ? accionEditar : accionCrear, ESTADO_INICIAL);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (estado.guardado) onCerrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.guardado]);

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
        aria-labelledby="descuento-formulario-titulo"
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[calc(100vh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
      >
        <h2 id="descuento-formulario-titulo" className="font-titulo text-lg font-bold text-texto">
          {descuento ? "Editar descuento" : "Crear descuento"}
        </h2>

        <form action={accion} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="porcentaje" className={CLASES_LABEL}>
              Porcentaje
            </label>
            <Input
              id="porcentaje"
              name="porcentaje"
              type="number"
              min={0.01}
              max={100}
              step="0.01"
              defaultValue={descuento?.porcentaje}
              required
              disabled={pendiente}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="fecha_inicio" className={CLASES_LABEL}>
                Desde (opcional)
              </label>
              <Input
                id="fecha_inicio"
                name="fecha_inicio"
                type="date"
                defaultValue={fechaParaInputLaPaz(descuento?.fecha_inicio ?? null)}
                disabled={pendiente}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="fecha_fin" className={CLASES_LABEL}>
                Hasta (opcional)
              </label>
              <Input
                id="fecha_fin"
                name="fecha_fin"
                type="date"
                defaultValue={fechaParaInputLaPaz(descuento?.fecha_fin ?? null)}
                disabled={pendiente}
              />
            </div>
          </div>

          {estado.error && (
            <p role="alert" className="flex items-center gap-2 font-cuerpo text-sm text-texto">
              <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
              {estado.error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button ref={cerrarRef} type="button" onClick={onCerrar} disabled={pendiente} className={clasesBoton("secundario")}>
              Cancelar
            </button>
            <Button type="submit" disabled={pendiente}>
              {pendiente ? "Guardando…" : descuento ? "Guardar los cambios" : "Crear descuento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
