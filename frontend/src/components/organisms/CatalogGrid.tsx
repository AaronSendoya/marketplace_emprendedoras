import type { ReactNode } from "react";

interface PropsCatalogGrid {
  children: ReactNode;
}

// Grid de cols-1 md:cols-2 lg:cols-3 (sección 5.4 del plan). Solo layout: recibe las tarjetas ya
// renderizadas, sea EmprendedoraCard o ProductoCard, para que ambos catálogos compartan una sola
// definición del grid.
export function CatalogGrid({ children }: PropsCatalogGrid) {
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
