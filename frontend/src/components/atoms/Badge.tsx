import type { ReactNode } from "react";

export type VarianteBadge = "neutro" | "acento" | "secundario" | "exito" | "ciudad" | "rubro";

const POR_VARIANTE: Record<VarianteBadge, string> = {
  neutro: "border border-borde bg-superficie text-texto-secundario",
  // Etiquetas del sitio público (regla 14): la ciudad en neutro sobre el fondo gris y el rubro en naranja tenue
  // (`#9A3412` sobre `#FFF7ED`, 6,9:1). Con `icono`, el de ubicación va delante de la ciudad.
  ciudad: "border border-borde bg-fondo font-semibold text-texto-secundario",
  rubro: "border border-enfasis-borde bg-enfasis-suave font-semibold text-enfasis-hover",
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
  // Icono delante del texto (ya renderizado, de unos 13 px). Solo para las etiquetas del sitio público.
  icono?: ReactNode;
  className?: string;
  children: ReactNode;
}

// "neutro" para ciudad/rubro (CLAUDE.md sección 6, regla 3); "acento" (en naranja: el color de
// promociones del sistema de 3 colores) para el porcentaje de un descuento vigente (regla 8,
// backend) — el nombre de la variante no cambia aunque su color ya no sea el acento magenta.
// `max-w-full` + `truncate` (regla de responsividad, 2026-09-29): un nombre de ciudad o rubro
// largo se corta con puntos suspensivos en vez de desbordar el contenedor — las tarjetas y las
// páginas de detalle son `overflow-hidden`, así que sin esto el texto se perdía en silencio.
export function Badge({ variante = "neutro", punto = false, icono, className = "", children }: PropsBadge) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-[var(--badge-py,0.125rem)] text-xs font-medium font-cuerpo ${POR_VARIANTE[variante]} ${className}`.trim()}
    >
      {punto && <span aria-hidden="true" className="mr-1.5 h-2 w-2 shrink-0 rounded-full bg-current" />}
      {icono && (
        <span aria-hidden="true" className="mr-1.5 shrink-0">
          {icono}
        </span>
      )}
      {children}
    </span>
  );
}
