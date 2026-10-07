import type { ComponentPropsWithoutRef } from "react";

interface PropsInput extends ComponentPropsWithoutRef<"input"> {
  // Borde en acento en vez de borde (validación en vivo, ej. ProductoFormularioModal): reemplaza
  // la clase en vez de agregar una encima, porque dos clases `border-*` en el mismo elemento
  // dependen del orden en que Tailwind las genera, no del orden en el className.
  invalido?: boolean;
  // "catalogo": el campo de la barra de filtros del sitio público (CLAUDE.md sección 6, regla 14): 44 px de
  // alto, sitio a la izquierda para el icono (el relleno va aparte: `px` y `pl` juntos dependen del orden en que
  // Tailwind los genera), borde naranja y un anillo suave al enfocar. Es una cadena completa aparte y no clases añadidas a
  // las de "base", por la misma razón que `invalido`.
  variante?: "base" | "catalogo";
}

const CLASES_CATALOGO =
  "campo-catalogo h-11 rounded-[0.625rem] border border-borde-fuerte bg-superficie pr-3.5 pl-10 text-[0.9375rem] font-cuerpo text-texto placeholder:text-texto-secundario transition-[border-color,box-shadow] hover:border-texto-secundario focus:border-marca focus:outline-none focus:ring-[3px] focus:ring-marca/20 disabled:cursor-not-allowed disabled:opacity-50";

// Superficies discretas (CLAUDE.md sección 6, regla 4): borde fino, sin sombra. Nativo de React,
// sin librería de formularios (sección 2 del plan): el estado (valor, onChange) lo maneja quien
// use este átomo.
export function Input({ className = "", invalido = false, variante = "base", ...props }: PropsInput) {
  const ancho = /(^|\s)w-/.test(className) ? "" : "w-full";
  const clases =
    variante === "catalogo"
      ? `${ancho} ${CLASES_CATALOGO} ${className}`
      : `${ancho} rounded-md border ${invalido ? "border-acento" : "border-borde"} bg-superficie px-3 py-[var(--control-py,0.5rem)] text-sm font-cuerpo text-texto placeholder:text-texto-secundario transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`;

  return <input aria-invalid={invalido} className={clases.replace(/\s+/g, " ").trim()} {...props} />;
}
