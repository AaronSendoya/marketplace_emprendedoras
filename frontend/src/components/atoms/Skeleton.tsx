interface PropsSkeleton {
  className?: string;
}

// Relleno neutro con pulso sutil (CLAUDE.md sección 6, regla 6: "movimiento mínimo", solo para
// dar retroalimentación). Siempre decorativo: quien lo use debe marcar como aria-hidden el bloque
// que lo contiene y anunciar la carga aparte (ver DetalleCargando / CatalogLoading).
export function Skeleton({ className = "" }: PropsSkeleton) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-borde ${className}`.trim()} />;
}
