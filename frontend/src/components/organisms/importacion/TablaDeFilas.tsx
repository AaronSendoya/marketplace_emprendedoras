"use client";

import { EyeOff, LoaderCircle } from "lucide-react";
import { Fragment, memo, type Dispatch } from "react";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";
import { esEditable, esImportable, type AccionFilas, type FilaEditable } from "@/lib/importacion/filas";
import { AvisosDeFila } from "./AvisosDeFila";
import { CampoDeLista, CampoDeTexto } from "./CamposDeFila";
import { EstadoDeImagenes } from "./EstadoDeImagenes";
import { InsigniaDeEstado } from "./InsigniaDeEstado";

interface PropsFila {
  fila: FilaEditable;
  ciudades: readonly ReferenciaCatalogo[];
  rubros: readonly ReferenciaCatalogo[];
  dispatch: Dispatch<AccionFilas>;
}

const CELDA = "px-3 pt-4 align-top";

// `memo`: al escribir en una fila, solo esa se vuelve a dibujar (el archivo puede traer hasta 500).
const FilaDeTabla = memo(function FilaDeTabla({ fila, ciudades, rubros, dispatch }: PropsFila) {
  const idDeAvisos = `avisos-fila-${fila.fila}`;
  const apagada = !esEditable(fila);
  const hayAvisos = fila.avisos.length > 0;

  return (
    <Fragment>
      <tr className={apagada ? "text-texto-secundario" : "text-texto"}>
        <td className={`w-12 ${CELDA}`}>
          <input
            type="checkbox"
            checked={fila.elegida && esImportable(fila)}
            disabled={!esImportable(fila)}
            onChange={(evento) => dispatch({ tipo: "elegir", fila: fila.fila, elegida: evento.target.checked })}
            aria-label={`Importar la fila ${fila.fila}`}
            aria-describedby={hayAvisos ? idDeAvisos : undefined}
            className="mt-1.5 size-5 cursor-pointer accent-acento disabled:cursor-not-allowed"
          />
        </td>
        <td className={`w-36 ${CELDA}`}>
          <InsigniaDeEstado estado={fila.estado} />
          <p className="mt-1.5 font-cuerpo text-xs text-texto-secundario">Fila {fila.fila}</p>
          {fila.oculta && (
            <p className="mt-1 flex items-center gap-1.5 font-cuerpo text-xs text-texto-secundario">
              <EyeOff size={13} strokeWidth={1.75} aria-hidden="true" />
              Oculta por filtro
            </p>
          )}
          {fila.revisando && (
            <p role="status" className="mt-1 flex items-center gap-1.5 font-cuerpo text-xs text-texto-secundario">
              <LoaderCircle size={13} strokeWidth={2} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              Revisando…
            </p>
          )}
        </td>
        <td className={`min-w-48 ${CELDA}`}>
          <div className="space-y-1.5">
            <CampoDeTexto fila={fila} campo="nombres" etiqueta="Nombres" dispatch={dispatch} />
            <div className="grid grid-cols-2 gap-1.5">
              <CampoDeTexto fila={fila} campo="apellido_paterno" etiqueta="Apellido paterno" dispatch={dispatch} marcador="Paterno" />
              <CampoDeTexto fila={fila} campo="apellido_materno" etiqueta="Apellido materno" dispatch={dispatch} marcador="Materno" />
            </div>
          </div>
        </td>
        <td className={`min-w-52 ${CELDA}`}>
          <div className="space-y-1.5">
            <CampoDeTexto fila={fila} campo="correo" etiqueta="Correo" dispatch={dispatch} tipo="email" />
            <CampoDeTexto fila={fila} campo="whatsapp" etiqueta="WhatsApp" dispatch={dispatch} tipo="tel" />
          </div>
        </td>
        <td className={`min-w-44 ${CELDA}`}>
          <div className="space-y-1.5">
            <CampoDeLista fila={fila} campo="ciudad_id" etiqueta="Ciudad" opciones={ciudades} dispatch={dispatch} />
            <CampoDeLista fila={fila} campo="rubro_id" etiqueta="Rubro" opciones={rubros} dispatch={dispatch} />
          </div>
        </td>
        <td className={`min-w-40 ${CELDA}`}>
          <CampoDeTexto fila={fila} campo="instagram" etiqueta="Instagram" dispatch={dispatch} marcador="Sin Instagram" />
          {fila.datos.otra_red_social && (
            <p className="mt-1.5 font-cuerpo text-xs break-all text-texto-secundario">Otra red social: {fila.datos.otra_red_social}</p>
          )}
        </td>
      </tr>
      <tr>
        <td className="border-b border-borde" />
        <td colSpan={5} className="space-y-2 border-b border-borde px-3 pt-3 pb-4">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <CampoDeTexto fila={fila} campo="nombre_negocio" etiqueta="Emprendimiento" dispatch={dispatch} visible />
            <CampoDeTexto fila={fila} campo="descripcion" etiqueta="Descripción" dispatch={dispatch} visible multilinea filas={2} />
          </div>
          <EstadoDeImagenes fila={fila} />
          <AvisosDeFila avisos={fila.avisos} id={idDeAvisos} />
        </td>
      </tr>
    </Fragment>
  );
});

interface PropsTabla {
  filas: readonly FilaEditable[];
  ciudades: readonly ReferenciaCatalogo[];
  rubros: readonly ReferenciaCatalogo[];
  dispatch: Dispatch<AccionFilas>;
}

const ENCABEZADO = "px-3 py-3 text-sm font-semibold text-texto-secundario";

// Desde `md`. Debajo, la misma información va en tarjetas (`TarjetasDeFilas`): regla 12, sección 6.
export function TablaDeFilas({ filas, ciudades, rubros, dispatch }: PropsTabla) {
  return (
    <div className="relative hidden overflow-x-auto md:block" role="region" aria-label="Filas del archivo" tabIndex={0}>
      <table className="w-full min-w-[820px] text-left font-cuerpo text-sm">
        <thead className="border-b border-borde bg-fondo">
          <tr>
            <th scope="col" className="w-12 px-3 py-3">
              <span className="sr-only">Importar</span>
            </th>
            <th scope="col" className={ENCABEZADO}>
              Estado
            </th>
            <th scope="col" className={ENCABEZADO}>
              Nombres y apellidos
            </th>
            <th scope="col" className={ENCABEZADO}>
              Correo y WhatsApp
            </th>
            <th scope="col" className={ENCABEZADO}>
              Ciudad y rubro
            </th>
            <th scope="col" className={ENCABEZADO}>
              Instagram
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <FilaDeTabla key={fila.fila} fila={fila} ciudades={ciudades} rubros={rubros} dispatch={dispatch} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
