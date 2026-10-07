import type { ComponentPropsWithoutRef } from "react";

interface PropsSelect extends ComponentPropsWithoutRef<"select"> {
  // "catalogo": el selector de la barra de filtros del sitio público (CLAUDE.md sección 6, regla 14). Quita la
  // flecha nativa (`appearance-none`) y deja sitio a la suya y a un icono delante: los pone `FilterSelect`.
  variante?: "base" | "catalogo";
}

const CLASES_CATALOGO =
  "h-11 appearance-none rounded-[0.625rem] border border-borde-fuerte bg-superficie pr-10 pl-10 text-[0.9375rem] font-cuerpo text-texto transition-[border-color,box-shadow] hover:border-texto-secundario focus:border-marca focus:outline-none focus:ring-[3px] focus:ring-marca/20 disabled:cursor-not-allowed disabled:opacity-50";

// Átomo genérico (recibe <option> como children): no conoce ciudades ni rubros. La molécula
// FilterSelect (paso 5 del plan) es la que traduce un catálogo del backend a opciones.
export function Select({ className = "", variante = "base", children, ...props }: PropsSelect) {
  const ancho = /(^|\s)w-/.test(className) ? "" : "w-full";
  const clases =
    variante === "catalogo"
      ? `${ancho} ${CLASES_CATALOGO} ${className}`
      : `${ancho} rounded-md border border-borde bg-superficie px-3 py-[var(--control-py,0.5rem)] text-sm font-cuerpo text-texto transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`;

  return (
    <select className={clases.replace(/\s+/g, " ").trim()} {...props}>
      {children}
    </select>
  );
}
