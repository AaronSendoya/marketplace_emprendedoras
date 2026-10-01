import type { ComponentPropsWithoutRef } from "react";

// Mismo tratamiento visual que Input (CLAUDE.md sección 6, regla 4): borde fino, sin sombra.
export function Textarea({ className = "", ...props }: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={`w-full rounded-md border border-borde bg-superficie px-3 py-2 text-sm font-cuerpo text-texto placeholder:text-texto-secundario transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      {...props}
    />
  );
}
