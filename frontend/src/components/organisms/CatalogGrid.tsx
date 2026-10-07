import type { ReactNode } from "react";

interface PropsCatalogGrid {
  children: ReactNode;
  // Cómo entran las tarjetas (CLAUDE.md sección 6, regla 6): "escalonada" una tras otra al cargar la página (por
  // defecto) o "ninguna". Es por tiempo y no por desplazamiento: nada queda oculto bajo el pliegue.
  animacion?: "escalonada" | "ninguna";
}

const CLASE_ANIMACION = { escalonada: "entrada-escalonada", ninguna: "" };

// Una columna debajo de `md`, dos desde `md` y tres desde 1180 px (CLAUDE.md sección 6, regla 14, puntos f y j): las tarjetas
// ganan ancho en vez de sumar columnas. `grid-cols-1` ya es `minmax(0, 1fr)`: una tarjeta con un nombre largo no ensancha su
// columna. Las tarjetas de una fila miden lo mismo (`items-stretch`
// es el valor por defecto y cada tarjeta pone `h-full`).
export function CatalogGrid({ children, animacion = "escalonada" }: PropsCatalogGrid) {
  return <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 rejilla:grid-cols-3 ${CLASE_ANIMACION[animacion]}`.trim()}>{children}</div>;
}
