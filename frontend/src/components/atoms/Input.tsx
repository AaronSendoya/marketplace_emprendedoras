import type { ComponentPropsWithoutRef } from "react";

// Superficies discretas (CLAUDE.md sección 6, regla 4): borde fino, sin sombra. Nativo de React,
// sin librería de formularios (sección 2 del plan): el estado (valor, onChange) lo maneja quien
// use este átomo.
export function Input({ className = "", ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={`w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm font-cuerpo text-texto placeholder:text-texto-secundario transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      {...props}
    />
  );
}
