import type { ReactNode } from "react";

export type VarianteBadge = "neutro" | "acento" | "secundario" | "exito";

const POR_VARIANTE: Record<VarianteBadge, string> = {
  neutro: "border border-borde bg-superficie text-texto-secundario",
  acento: "bg-enfasis-suave text-enfasis",
  // Salvia: solo el estado positivo "Publicado" del panel de la Emprendedora (sección 6, regla 11).
  exito: "bg-salvia-suave text-salvia",
  // Púrpura (rol de "estado distinguido", CLAUDE.md sección 6, regla 2): distingue el rol Admin
  // del Emprendedor en el panel, sin inventar un cuarto color fuera del sistema de tres.
  secundario: "bg-secundario-suave text-secundario",
};

interface PropsBadge {
  variante?: VarianteBadge;
  // Punto de color delante del texto (el color del propio texto): las insignias de estado del Admin
  // (sección 6, regla 13) lo llevan.
  punto?: boolean;
  className?: string;
  children: ReactNode;
}

// "neutro" para ciudad/rubro (CLAUDE.md sección 6, regla 3); "acento" (en naranja: el color de
// promociones del sistema de 3 colores) para el porcentaje de un descuento vigente (regla 8,
// backend) — el nombre de la variante no cambia aunque su color ya no sea el acento magenta.
// `max-w-full` + `truncate` (regla de responsividad, 2026-09-29): un nombre de ciudad o rubro
// largo se corta con puntos suspensivos en vez de desbordar el contenedor — las tarjetas y las
// páginas de detalle son `overflow-hidden`, así que sin esto el texto se perdía en silencio.
export function Badge({ variante = "neutro", punto = false, className = "", children }: PropsBadge) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-[var(--badge-py,0.125rem)] text-xs font-medium font-cuerpo ${POR_VARIANTE[variante]} ${className}`.trim()}
    >
      {punto && <span aria-hidden="true" className="mr-1.5 h-2 w-2 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}
