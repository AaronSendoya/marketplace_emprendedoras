import type { ComponentPropsWithoutRef } from "react";

interface PropsInput extends ComponentPropsWithoutRef<"input"> {
  // Borde en acento en vez de borde (validación en vivo, ej. ProductoFormularioModal): reemplaza
  // la clase en vez de agregar una encima, porque dos clases `border-*` en el mismo elemento
  // dependen del orden en que Tailwind las genera, no del orden en el className.
  invalido?: boolean;
}

// Superficies discretas (CLAUDE.md sección 6, regla 4): borde fino, sin sombra. Nativo de React,
// sin librería de formularios (sección 2 del plan): el estado (valor, onChange) lo maneja quien
// use este átomo.
export function Input({ className = "", invalido = false, ...props }: PropsInput) {
  return (
    <input
      aria-invalid={invalido}
      className={`${/(^|\s)w-/.test(className) ? "" : "w-full"} rounded-md border ${invalido ? "border-acento" : "border-borde"} bg-superficie px-3 py-[var(--control-py,0.5rem)] text-sm font-cuerpo text-texto placeholder:text-texto-secundario transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      {...props}
    />
  );
}
