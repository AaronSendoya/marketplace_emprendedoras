import type { ReactNode } from "react";

export type VarianteBadge = "neutro" | "acento" | "secundario";

const POR_VARIANTE: Record<VarianteBadge, string> = {
  neutro: "border border-borde bg-superficie text-texto-secundario",
  acento: "bg-enfasis-suave text-enfasis",
  // Púrpura (rol de "estado distinguido", CLAUDE.md sección 6, regla 2): distingue el rol Admin
  // del Emprendedor en el panel, sin inventar un cuarto color fuera del sistema de tres.
  secundario: "bg-secundario-suave text-secundario",
};

interface PropsBadge {
  variante?: VarianteBadge;
  className?: string;
  children: ReactNode;
}

// "neutro" para ciudad/rubro (CLAUDE.md sección 6, regla 3); "acento" (en naranja: el color de
// promociones del sistema de 3 colores) para el porcentaje de un descuento vigente (regla 8,
// backend) — el nombre de la variante no cambia aunque su color ya no sea el acento magenta.
// `max-w-full` + `truncate` (regla de responsividad, 2026-09-29): un nombre de ciudad o rubro
// largo se corta con puntos suspensivos en vez de desbordar el contenedor — las tarjetas y las
// páginas de detalle son `overflow-hidden`, así que sin esto el texto se perdía en silencio.
export function Badge({ variante = "neutro", className = "", children }: PropsBadge) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-medium font-cuerpo ${POR_VARIANTE[variante]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
