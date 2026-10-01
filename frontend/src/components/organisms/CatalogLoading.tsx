import { Skeleton } from "@/components/atoms/Skeleton";
import { TarjetaEsqueleto } from "@/components/molecules/TarjetaEsqueleto";

interface PropsCatalogLoading {
  etiqueta: string;
}

// loading.tsx de /emprendedoras y /promociones (Next envuelve la página en Suspense mientras el
// Server Component espera el fetch). role="status" + un texto en sr-only avisan a lectores de
// pantalla que algo está cargando; el resto del esqueleto es puramente visual (aria-hidden).
export function CatalogLoading({ etiqueta }: PropsCatalogLoading) {
  return (
    <main className="flex-1">
      <div role="status">
        <span className="sr-only">{etiqueta}</span>
      </div>

      <div aria-hidden="true">
        <Skeleton className="aspect-[16/9] w-full rounded-none sm:aspect-[3/1] lg:aspect-[2732/590]" />

        <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 sm:w-48" />
            <Skeleton className="h-10 sm:w-48" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, indice) => (
              <TarjetaEsqueleto key={indice} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
