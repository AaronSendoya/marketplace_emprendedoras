"use client";

import { Check, CircleX, FileSpreadsheet, Info, Minus, TriangleAlert } from "lucide-react";
import { useState, type Dispatch } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";
import { CLASES_FOCO_CONTROL, CLASES_PANEL_ADMIN, clasesChip } from "@/lib/estilos";
import {
  esImportable,
  pasaElFiltro,
  resumenDe,
  type AccionFilas,
  type FilaEditable,
  type FiltroDeFilas,
} from "@/lib/importacion/filas";
import { TablaDeFilas } from "./TablaDeFilas";
import { TarjetasDeFilas } from "./TarjetasDeFilas";

export interface DatosDelArchivo {
  nombre: string;
  hoja: string;
  hojas: string[];
  ignoradas: string[];
  opcionalesAusentes: string[];
}

interface PropsVistaPrevia {
  archivo: DatosDelArchivo;
  filas: readonly FilaEditable[];
  ciudades: readonly ReferenciaCatalogo[];
  rubros: readonly ReferenciaCatalogo[];
  dispatch: Dispatch<AccionFilas>;
  onCambiarArchivo: () => void;
}

const TARJETAS_DE_RESUMEN = [
  { filtro: "todas", nombre: "Filas", punto: "bg-texto-secundario", valor: (r: ReturnType<typeof resumenDe>) => r.total },
  { filtro: "lista", nombre: "Listas", punto: "bg-salvia", valor: (r: ReturnType<typeof resumenDe>) => r.listas },
  { filtro: "revisar", nombre: "Para revisar", punto: "bg-aviso", valor: (r: ReturnType<typeof resumenDe>) => r.revisar },
  { filtro: "error", nombre: "Con error", punto: "bg-error", valor: (r: ReturnType<typeof resumenDe>) => r.conError },
  { filtro: "omitidas", nombre: "Se omiten", punto: "bg-borde-fuerte", valor: (r: ReturnType<typeof resumenDe>) => r.omitidas },
  { filtro: "ocultas", nombre: "Ocultas por filtro", punto: "bg-secundario", valor: (r: ReturnType<typeof resumenDe>) => r.ocultas },
] as const satisfies readonly { filtro: FiltroDeFilas; nombre: string; punto: string; valor: (r: ReturnType<typeof resumenDe>) => number }[];

const ICONO_LEYENDA = 14;

// Paso 2: la vista previa (regla 22). Resume el archivo, deja filtrar por estado, edita cada dato y marca qué se importa.
export function VistaPreviaImportacion({ archivo, filas, ciudades, rubros, dispatch, onCambiarArchivo }: PropsVistaPrevia) {
  const [filtro, setFiltro] = useState<FiltroDeFilas>("todas");
  const resumen = resumenDe(filas);
  const visibles = filas.filter((fila) => pasaElFiltro(fila, filtro));
  const importables = filas.filter(esImportable);
  const todasMarcadas = importables.length > 0 && importables.every((fila) => fila.elegida);

  // Pulsar el filtro activo lo quita.
  const alternar = (nuevo: FiltroDeFilas) => setFiltro((actual) => (actual === nuevo ? "todas" : nuevo));

  return (
    <div className="space-y-4">
      <div className={`${CLASES_PANEL_ADMIN} flex flex-col gap-3 p-4 sm:flex-row sm:items-center`}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-salvia-suave text-salvia">
            <FileSpreadsheet size={22} strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <p className="font-cuerpo text-base font-semibold break-words text-texto">{archivo.nombre}</p>
            <p className="font-cuerpo text-xs text-texto-secundario">
              Se leyó la hoja «{archivo.hoja}»
              {archivo.ignoradas.length > 0 && (
                <>
                  {" "}
                  · {archivo.ignoradas.length} {archivo.ignoradas.length === 1 ? "columna ignorada" : "columnas ignoradas"} a propósito (marca temporal, fotos, logo
                  y beneficio)
                </>
              )}
            </p>
          </div>
        </div>
        <button type="button" onClick={onCambiarArchivo} className={clasesBoton("secundario", "min-h-11 w-full sm:w-auto lg:min-h-0")}>
          Cambiar archivo
        </button>
      </div>

      {(archivo.hojas.length > 1 || archivo.opcionalesAusentes.length > 0) && (
        <ul className="space-y-1.5">
          {archivo.hojas.length > 1 && (
            <li className="flex items-start gap-2 rounded-md bg-fondo px-3 py-2 font-cuerpo text-xs text-texto-secundario">
              <Info size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
              Se leyó la hoja «{archivo.hoja}» (la que tiene los encabezados). Si necesitabas otra, sube un archivo solo con esa hoja.
            </li>
          )}
          {archivo.opcionalesAusentes.length > 0 && (
            <li className="flex items-start gap-2 rounded-md bg-fondo px-3 py-2 font-cuerpo text-xs text-texto-secundario">
              <Info size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
              El archivo no trae la columna {archivo.opcionalesAusentes.map((nombre) => `«${nombre}»`).join(", ")}: las filas se importan sin ese dato.
            </li>
          )}
        </ul>
      )}

      <div role="group" aria-label="Resumen de la hoja" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {TARJETAS_DE_RESUMEN.map(({ filtro: destino, nombre, punto, valor }) => {
          const activo = filtro === destino;
          return (
            <button
              key={destino}
              type="button"
              aria-pressed={activo}
              onClick={() => alternar(destino)}
              className={`flex min-h-11 flex-col items-start gap-1 rounded-lg border p-3.5 text-left transition-colors ${CLASES_FOCO_CONTROL} ${
                activo ? "border-secundario bg-secundario-suave" : "border-borde bg-superficie hover:border-secundario"
              }`}
            >
              <span className="font-titulo text-2xl leading-none font-extrabold text-texto tabular-nums">{valor(resumen)}</span>
              <span className="flex items-center gap-1.5 font-cuerpo text-xs text-texto-secundario">
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${punto}`} />
                {nombre}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`${CLASES_PANEL_ADMIN} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borde p-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar filas por estado">
            {(["todas", "lista", "revisar", "error"] as const).map((opcion) => {
              const tarjeta = TARJETAS_DE_RESUMEN.find((t) => t.filtro === opcion)!;
              return (
                <button key={opcion} type="button" aria-pressed={filtro === opcion} onClick={() => setFiltro(opcion)} className={clasesChip(filtro === opcion)}>
                  {tarjeta.nombre} ({tarjeta.valor(resumen)})
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={importables.length === 0}
            onClick={() => dispatch({ tipo: "elegirTodas", elegida: !todasMarcadas })}
            className={clasesBoton("secundario", "min-h-11 w-full sm:w-auto lg:min-h-0")}
          >
            {todasMarcadas ? "Quitar todas las marcas" : "Marcar todas las que se pueden importar"}
          </button>
        </div>

        {visibles.length === 0 ? (
          <div className="p-4">
            <EstadoVacio icono={FileSpreadsheet} titulo="No hay filas con ese estado" descripcion="Elige otro estado arriba para ver el resto de las filas." />
          </div>
        ) : (
          <>
            <TablaDeFilas filas={visibles} ciudades={ciudades} rubros={rubros} dispatch={dispatch} />
            <TarjetasDeFilas filas={visibles} ciudades={ciudades} rubros={rubros} dispatch={dispatch} />
          </>
        )}

        <ul aria-label="Qué significa cada estado" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-borde bg-fondo px-4 py-3 font-cuerpo text-xs text-texto-secundario">
          <li className="flex items-center gap-1.5">
            <Check size={ICONO_LEYENDA} strokeWidth={2.4} aria-hidden="true" className="text-salvia" />
            <b className="font-semibold text-texto">Lista:</b> se puede importar tal cual
          </li>
          <li className="flex items-center gap-1.5">
            <TriangleAlert size={ICONO_LEYENDA} strokeWidth={2} aria-hidden="true" className="text-aviso" />
            <b className="font-semibold text-texto">Para revisar:</b> el sistema supuso algo; míralo
          </li>
          <li className="flex items-center gap-1.5">
            <CircleX size={ICONO_LEYENDA} strokeWidth={2.2} aria-hidden="true" className="text-error" />
            <b className="font-semibold text-texto">Con error:</b> corrígela para poder importarla
          </li>
          <li className="flex items-center gap-1.5">
            <Minus size={ICONO_LEYENDA} strokeWidth={2} aria-hidden="true" />
            <b className="font-semibold text-texto">Ya existe y Repetida:</b> se omiten
          </li>
        </ul>
      </div>
    </div>
  );
}
