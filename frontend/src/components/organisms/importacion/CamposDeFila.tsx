"use client";

import type { Dispatch } from "react";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";
import { esEditable, severidadDeCampo, type AccionFilas, type CampoEditable, type FilaEditable } from "@/lib/importacion/filas";

// Los controles de un dato de una fila de la vista previa (regla 22). El borde y el fondo dicen si el dato tiene un error o una
// suposición que revisar; el mensaje va debajo de la fila (`AvisosDeFila`). Cadenas completas por estado para que Tailwind las
// encuentre y para que dos clases de borde o de fondo nunca compitan en un mismo elemento.
const BASE =
  "min-h-11 w-full rounded-md border px-2.5 py-1.5 font-cuerpo text-sm text-texto transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-fondo disabled:text-texto-secundario lg:min-h-9";
const POR_SEVERIDAD = {
  ninguna: "border-borde bg-superficie",
  revisar: "border-aviso-borde bg-aviso-suave",
  error: "border-error bg-error-suave",
};

interface PropsBase {
  fila: FilaEditable;
  campo: CampoEditable;
  etiqueta: string;
  dispatch: Dispatch<AccionFilas>;
  // Con la etiqueta a la vista (las tarjetas de móvil); sin ella, solo para lectores de pantalla (las celdas de la tabla).
  visible?: boolean;
  idDeAvisos?: string;
}

function Envoltorio({ visible, etiqueta, fila, children }: Pick<PropsBase, "visible" | "etiqueta" | "fila"> & { children: React.ReactNode }) {
  if (!visible) return <>{children}</>;
  return (
    <label className="block space-y-1">
      <span className="font-cuerpo text-xs font-medium text-texto-secundario">{etiqueta}</span>
      {children}
      <span className="sr-only"> de la fila {fila.fila}</span>
    </label>
  );
}

export function CampoDeTexto({
  fila,
  campo,
  etiqueta,
  dispatch,
  visible = false,
  idDeAvisos,
  multilinea = false,
  filas = 3,
  tipo = "text",
  marcador,
}: PropsBase & { multilinea?: boolean; filas?: number; tipo?: "text" | "email" | "tel"; marcador?: string }) {
  const severidad = severidadDeCampo(fila, campo) ?? "ninguna";
  const propiedades = {
    value: fila.datos[campo],
    disabled: !esEditable(fila),
    placeholder: marcador,
    "aria-label": visible ? undefined : `${etiqueta} de la fila ${fila.fila}`,
    "aria-invalid": severidad === "error" || undefined,
    "aria-describedby": idDeAvisos,
    autoComplete: "off",
    className: `${BASE} ${POR_SEVERIDAD[severidad]}`,
    onChange: (evento: { target: { value: string } }) => dispatch({ tipo: "editar", fila: fila.fila, campo, valor: evento.target.value }),
  };

  return (
    <Envoltorio visible={visible} etiqueta={etiqueta} fila={fila}>
      {multilinea ? <textarea rows={filas} {...propiedades} /> : <input type={tipo} spellCheck={false} {...propiedades} />}
    </Envoltorio>
  );
}

export function CampoDeLista({
  fila,
  campo,
  etiqueta,
  opciones,
  dispatch,
  visible = false,
  idDeAvisos,
}: PropsBase & { opciones: readonly ReferenciaCatalogo[] }) {
  const severidad = severidadDeCampo(fila, campo) ?? "ninguna";
  const valor = fila.datos[campo];

  return (
    <Envoltorio visible={visible} etiqueta={etiqueta} fila={fila}>
      <select
        value={opciones.some((opcion) => opcion.id === valor) ? valor : ""}
        disabled={!esEditable(fila)}
        aria-label={visible ? undefined : `${etiqueta} de la fila ${fila.fila}`}
        aria-invalid={severidad === "error" || undefined}
        aria-describedby={idDeAvisos}
        className={`${BASE} ${POR_SEVERIDAD[severidad]}`}
        onChange={(evento) => dispatch({ tipo: "editar", fila: fila.fila, campo, valor: evento.target.value })}
      >
        <option value="">Elige una…</option>
        {opciones.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {opcion.nombre}
          </option>
        ))}
      </select>
    </Envoltorio>
  );
}
