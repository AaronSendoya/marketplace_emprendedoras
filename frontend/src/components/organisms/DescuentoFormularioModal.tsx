"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, clasesBoton } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Textarea } from "@/components/atoms/Textarea";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { crearDescuentoAction, editarDescuentoAction, type EstadoFormularioDescuento } from "@/lib/admin/descuentos-acciones";
import type { Descuento } from "@/lib/api/tipos";
import { fechaParaInputLaPaz } from "@/lib/formato/fecha";
import { errorPorcentajeDescuento, LIMITES_DESCUENTO } from "@/lib/validacion/producto";
import { useTrampaDeFoco } from "@/lib/hooks/useTrampaDeFoco";
import { useEnvioSinReinicio } from "@/lib/hooks/useEnvioSinReinicio";

// Alta y edición de un descuento. Por defecto son las acciones del Admin; el panel de la
// Emprendedora pasa las suyas (mismo formulario y mismas validaciones, otra ruta a revalidar).
export interface AccionesFormularioDescuento {
  crear: (estadoPrevio: EstadoFormularioDescuento, formData: FormData) => Promise<EstadoFormularioDescuento>;
  editar: (descuentoId: string, estadoPrevio: EstadoFormularioDescuento, formData: FormData) => Promise<EstadoFormularioDescuento>;
}

interface PropsDescuentoFormularioModal {
  perfilId?: string;
  usuarioId?: string;
  descuento: Descuento | null;
  abierto: boolean;
  onCerrar: () => void;
  acciones?: AccionesFormularioDescuento;
  // Cómo se llama el recurso en pantalla: el Admin dice "descuento", el panel de la Emprendedora
  // "promoción" (el mismo nombre que ya ve en el catálogo público).
  etiqueta?: string;
}

const CLASES_LABEL = "font-cuerpo text-sm font-medium text-texto";
const CLASES_ERROR = "flex items-center gap-2 font-cuerpo text-xs text-acento";
const ESTADO_INICIAL: EstadoFormularioDescuento = {};

// Un solo modal para alta y edición. Regla 8 (backend): las fechas son opcionales e independientes
// — sin inicio rige desde que se crea, sin fin es permanente — y un descuento no se borra, se
// termina editando `fecha_fin`, así que este mismo formulario sirve para eso.
export function DescuentoFormularioModal({
  perfilId = "",
  usuarioId = "",
  descuento,
  abierto,
  onCerrar,
  acciones,
  etiqueta = "descuento",
}: PropsDescuentoFormularioModal) {
  const descuentoId = descuento?.id ?? "";
  const accionCrear = acciones?.crear ?? crearDescuentoAction.bind(null, perfilId, usuarioId);
  const accionEditar = acciones ? acciones.editar.bind(null, descuentoId) : editarDescuentoAction.bind(null, descuentoId, usuarioId);
  const { estado, alEnviar, pendiente } = useEnvioSinReinicio(descuento ? accionEditar : accionCrear, ESTADO_INICIAL);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // Validación en vivo (onBlur): solo feedback anticipado, la fuente de verdad sigue siendo el
  // Zod del backend al enviar.
  const [errorPorcentaje, setErrorPorcentaje] = useState<string | undefined>();
  const [tocadoPorcentaje, setTocadoPorcentaje] = useState(false);

  // Cuántos caracteres lleva el detalle, para el contador `n/280`: el campo no es controlado (como el resto del
  // formulario), así que solo se lleva la cuenta.
  const [largoDetalle, setLargoDetalle] = useState(descuento?.descripcion?.length ?? 0);

  // Avisa antes de perder cambios sin guardar al cerrar por accidente (fondo, "Cancelar" o
  // Escape).
  const [sinGuardar, setSinGuardar] = useState(false);
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  // El listener de Escape vive en un efecto que solo depende de `abierto` (mismo criterio que
  // ProductoFormularioModal): lee estos refs para no quedarse con un valor viejo de
  // `sinGuardar`/`onCerrar` mientras el modal sigue abierto. Se actualizan en su propio efecto.
  const sinGuardarRef = useRef(sinGuardar);
  const onCerrarRef = useRef(onCerrar);
  const dialogoRef = useRef<HTMLDivElement>(null);
  useTrampaDeFoco(dialogoRef, abierto);

  useEffect(() => {
    sinGuardarRef.current = sinGuardar;
    onCerrarRef.current = onCerrar;
  }, [sinGuardar, onCerrar]);

  // Reinicia la validación y el aviso de cambios al (re)abrir el modal — "adjusting state when a
  // prop changes" durante el render, en vez de un useEffect con setState adentro.
  const [abiertoPrevio, setAbiertoPrevio] = useState(abierto);
  if (abierto !== abiertoPrevio) {
    setAbiertoPrevio(abierto);
    if (abierto) {
      setErrorPorcentaje(undefined);
      setTocadoPorcentaje(false);
      setLargoDetalle(descuento?.descripcion?.length ?? 0);
      setSinGuardar(false);
    }
  }

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
      if (evento.key !== "Escape") return;
      if (sinGuardarRef.current) setConfirmarCierre(true);
      else onCerrarRef.current();
    }
    window.addEventListener("keydown", alPresionarTecla);

    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [abierto]);

  if (!abierto) return null;

  function intentarCerrar() {
    if (sinGuardar) {
      setConfirmarCierre(true);
      return;
    }
    onCerrar();
  }

  function alCambiarFormulario() {
    setSinGuardar(true);
  }

  function validarPorcentajeAlSalir(valor: string) {
    setTocadoPorcentaje(true);
    setErrorPorcentaje(errorPorcentajeDescuento(valor) ?? undefined);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-texto/60 p-4" onClick={intentarCerrar}>
        <div
          role="dialog"
          aria-modal="true"
          ref={dialogoRef}
          tabIndex={-1}
          aria-labelledby="descuento-formulario-titulo"
          onClick={(evento) => evento.stopPropagation()}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg bg-superficie p-6 shadow-lg"
        >
          <h2 id="descuento-formulario-titulo" className="font-titulo text-lg font-bold text-texto">
            {descuento ? `Editar ${etiqueta}` : `Crear ${etiqueta}`}
          </h2>

          <form onSubmit={alEnviar} onChange={alCambiarFormulario} className="space-y-4">
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
                onBlur={(evento: FormEvent<HTMLInputElement>) => validarPorcentajeAlSalir(evento.currentTarget.value)}
                invalido={Boolean(tocadoPorcentaje && errorPorcentaje)}
              />
              {tocadoPorcentaje && errorPorcentaje && (
                <p role="alert" className={CLASES_ERROR}>
                  <CircleAlert size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
                  {errorPorcentaje}
                </p>
              )}
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

            <div className="space-y-1">
              <label htmlFor="descripcion" className={CLASES_LABEL}>
                Detalle (opcional)
              </label>
              <Textarea
                id="descripcion"
                name="descripcion"
                rows={3}
                maxLength={LIMITES_DESCUENTO.descripcionMax}
                defaultValue={descuento?.descripcion ?? ""}
                placeholder="Ej.: Día de la Madre, en toda la línea de tortas"
                aria-describedby="descripcion-ayuda"
                disabled={pendiente}
                onChange={(evento) => setLargoDetalle(evento.currentTarget.value.length)}
              />
              <p id="descripcion-ayuda" className="flex items-start justify-between gap-3 font-cuerpo text-xs text-texto-secundario">
                <span>Una nota para explicar de qué trata. Hasta {LIMITES_DESCUENTO.descripcionMax} caracteres.</span>
                <span
                  aria-hidden="true"
                  className={`shrink-0 tabular-nums ${largoDetalle >= LIMITES_DESCUENTO.descripcionMax - 20 ? "font-medium text-acento" : ""}`.trim()}
                >
                  {largoDetalle}/{LIMITES_DESCUENTO.descripcionMax}
                </span>
              </p>
            </div>

            {estado.error && (
              <p role="alert" className="flex items-center gap-2 font-cuerpo text-sm text-texto">
                <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
                {estado.error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button ref={cerrarRef} type="button" onClick={intentarCerrar} disabled={pendiente} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
                Cancelar
              </button>
              <Button type="submit" disabled={pendiente} className="min-h-11 lg:min-h-0">
                {pendiente ? "Guardando…" : descuento ? "Guardar los cambios" : `Crear ${etiqueta}`}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        abierto={confirmarCierre}
        onCerrar={() => setConfirmarCierre(false)}
        onConfirmar={async () => {
          setSinGuardar(false);
          onCerrar();
        }}
        titulo="¿Descartar los cambios?"
        descripcion="Perderás lo que cambiaste en este formulario."
        textoConfirmar="Descartar"
        variante="peligro"
      />
    </>
  );
}
