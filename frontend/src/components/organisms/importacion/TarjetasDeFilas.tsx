"use client";

import { EyeOff, LoaderCircle, Pencil, X } from "lucide-react";
import { memo, useState, type Dispatch } from "react";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";
import { esEditable, esImportable, nombreCompleto, type AccionFilas, type FilaEditable } from "@/lib/importacion/filas";
import { AvisosDeFila } from "./AvisosDeFila";
import { CampoDeLista, CampoDeTexto } from "./CamposDeFila";
import { EstadoDeImagenes } from "./EstadoDeImagenes";
import { InsigniaDeEstado } from "./InsigniaDeEstado";

interface PropsTarjeta {
  fila: FilaEditable;
  ciudades: readonly ReferenciaCatalogo[];
  rubros: readonly ReferenciaCatalogo[];
  dispatch: Dispatch<AccionFilas>;
}

const nombreDe = (lista: readonly ReferenciaCatalogo[], id: string) => lista.find((item) => item.id === id)?.nombre;

const TarjetaDeFila = memo(function TarjetaDeFila({ fila, ciudades, rubros, dispatch }: PropsTarjeta) {
  const [editando, setEditando] = useState(false);
  const idDeAvisos = `avisos-tarjeta-${fila.fila}`;
  const idDeEdicion = `edicion-tarjeta-${fila.fila}`;
  const { datos } = fila;

  return (
    <article className={`space-y-3 rounded-lg border border-borde bg-superficie p-4 ${esEditable(fila) ? "" : "text-texto-secundario"}`}>
      <header className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={fila.elegida && esImportable(fila)}
          disabled={!esImportable(fila)}
          onChange={(evento) => dispatch({ tipo: "elegir", fila: fila.fila, elegida: evento.target.checked })}
          aria-label={`Importar la fila ${fila.fila}`}
          aria-describedby={fila.avisos.length > 0 ? idDeAvisos : undefined}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-acento disabled:cursor-not-allowed"
        />
        <div className="min-w-0 flex-1">
          <p className="font-cuerpo text-base font-semibold break-words text-texto">{nombreCompleto(datos) || "Sin nombre"}</p>
          <p className="font-cuerpo text-sm break-all text-texto-secundario">{datos.correo || "Sin correo"}</p>
        </div>
        <InsigniaDeEstado estado={fila.estado} />
      </header>

      <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 font-cuerpo text-sm">
        <dt className="text-xs text-texto-secundario">Fila</dt>
        <dd>
          {fila.fila}
          {fila.oculta && (
            <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-texto-secundario">
              <EyeOff size={13} strokeWidth={1.75} aria-hidden="true" />
              Oculta por filtro
            </span>
          )}
        </dd>
        <dt className="text-xs text-texto-secundario">WhatsApp</dt>
        <dd className="break-all">{datos.whatsapp || "—"}</dd>
        <dt className="text-xs text-texto-secundario">Ciudad</dt>
        <dd>{nombreDe(ciudades, datos.ciudad_id) ?? <span className="text-error">Falta elegir</span>}</dd>
        <dt className="text-xs text-texto-secundario">Rubro</dt>
        <dd>{nombreDe(rubros, datos.rubro_id) ?? <span className="text-error">Falta elegir</span>}</dd>
        <dt className="text-xs text-texto-secundario">Instagram</dt>
        <dd className="break-all">{datos.instagram || "—"}</dd>
        {datos.otra_red_social && (
          <>
            <dt className="text-xs text-texto-secundario">Otra red social</dt>
            <dd className="break-all">{datos.otra_red_social}</dd>
          </>
        )}
        <dt className="text-xs text-texto-secundario">Emprendimiento</dt>
        <dd className="break-words">{datos.nombre_negocio || <span className="text-error">Falta</span>}</dd>
        <dt className="text-xs text-texto-secundario">Descripción</dt>
        <dd className="line-clamp-3 break-words">{datos.descripcion || <span className="text-error">Falta</span>}</dd>
      </dl>

      <EstadoDeImagenes fila={fila} />

      {fila.revisando && (
        <p role="status" className="flex items-center gap-1.5 font-cuerpo text-xs text-texto-secundario">
          <LoaderCircle size={13} strokeWidth={2} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          Revisando…
        </p>
      )}

      <AvisosDeFila avisos={fila.avisos} id={idDeAvisos} />

      {esEditable(fila) && (
        <>
          <button
            type="button"
            onClick={() => setEditando((valor) => !valor)}
            aria-expanded={editando}
            aria-controls={idDeEdicion}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-borde bg-superficie px-3.5 font-cuerpo text-sm font-medium text-texto transition-colors hover:border-acento hover:text-acento focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {editando ? <X size={16} strokeWidth={1.75} aria-hidden="true" /> : <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />}
            {editando ? "Cerrar" : "Editar datos"}
          </button>
          {editando && (
            <div id={idDeEdicion} className="space-y-3 border-t border-borde pt-3">
              <CampoDeTexto fila={fila} campo="nombres" etiqueta="Nombres" dispatch={dispatch} visible />
              <CampoDeTexto fila={fila} campo="apellido_paterno" etiqueta="Apellido paterno" dispatch={dispatch} visible />
              <CampoDeTexto fila={fila} campo="apellido_materno" etiqueta="Apellido materno (opcional)" dispatch={dispatch} visible />
              <CampoDeTexto fila={fila} campo="correo" etiqueta="Correo" dispatch={dispatch} visible tipo="email" />
              <CampoDeTexto fila={fila} campo="whatsapp" etiqueta="WhatsApp" dispatch={dispatch} visible tipo="tel" />
              <CampoDeLista fila={fila} campo="ciudad_id" etiqueta="Ciudad" opciones={ciudades} dispatch={dispatch} visible />
              <CampoDeLista fila={fila} campo="rubro_id" etiqueta="Rubro" opciones={rubros} dispatch={dispatch} visible />
              <CampoDeTexto fila={fila} campo="instagram" etiqueta="Instagram (sin arroba)" dispatch={dispatch} visible />
              <CampoDeTexto fila={fila} campo="nombre_negocio" etiqueta="Emprendimiento" dispatch={dispatch} visible />
              <CampoDeTexto fila={fila} campo="descripcion" etiqueta="Descripción" dispatch={dispatch} visible multilinea />
            </div>
          )}
        </>
      )}
    </article>
  );
});

// Debajo de `md`: tarjetas apiladas en vez de tabla (regla 12, sección 6).
export function TarjetasDeFilas({ filas, ciudades, rubros, dispatch }: { filas: readonly FilaEditable[] } & Omit<PropsTarjeta, "fila">) {
  return (
    <div className="space-y-3 p-3 md:hidden">
      {filas.map((fila) => (
        <TarjetaDeFila key={fila.fila} fila={fila} ciudades={ciudades} rubros={rubros} dispatch={dispatch} />
      ))}
    </div>
  );
}
