import type { ComponentPropsWithoutRef } from "react";

interface PropsTextarea extends ComponentPropsWithoutRef<"textarea"> {
  // Ver Input.tsx: reemplaza el borde en vez de agregar una clase `border-*` encima.
  invalido?: boolean;
}

// Mismo tratamiento visual que Input (CLAUDE.md sección 6, regla 4): borde fino, sin sombra.
export function Textarea({ className = "", invalido = false, ...props }: PropsTextarea) {
  return (
    <textarea
      aria-invalid={invalido}
      className={`w-full rounded-md border ${invalido ? "border-acento" : "border-borde"} bg-superficie px-3 py-[var(--control-py,0.5rem)] text-sm font-cuerpo text-texto placeholder:text-texto-secundario transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
      {...props}
    />
  );
}
