import { Skeleton } from "@/components/atoms/Skeleton";

interface PropsDetalleCargando {
  etiqueta: string;
}

// loading.tsx de /emprendedoras/[id] y /productos/[id]: misma silueta que el detalle real
// (enlace de vuelta + foto + título + badges + texto). Igual que CatalogLoading, el aviso a
// lectores de pantalla va en un texto sr-only dentro de role="status", separado del esqueleto
// puramente visual.
export function DetalleCargando({ etiqueta }: PropsDetalleCargando) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div role="status">
        <span className="sr-only">{etiqueta}</span>
      </div>

      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="h-5 w-40" />

        <div className="overflow-hidden rounded-lg border border-borde bg-superficie">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />

          <div className="space-y-4 p-6">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </main>
  );
}
