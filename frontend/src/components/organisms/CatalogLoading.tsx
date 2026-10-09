import { Skeleton } from "@/components/atoms/Skeleton";
import { TarjetaEsqueleto } from "@/components/molecules/TarjetaEsqueleto";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

interface PropsCatalogLoading {
  etiqueta: string;
  // «mercado»: las tarjetas compactas de Productos; «promocion»: las de Promociones (regla 14, punto l).
  variante?: "emprendedora" | "producto" | "mercado" | "promocion";
}

// La silueta de una tarjeta compacta del mercado de Productos: imagen cuadrada y tres líneas.
function EsqueletoMercado() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3.5 w-3/5" />
    </div>
  );
}

// La silueta de una tarjeta de promoción: la tira de productos, el negocio, el titular, el texto y el botón.
function EsqueletoPromocion() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-superficie border border-borde bg-superficie shadow-tarjeta">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="flex-1 space-y-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-[2.375rem] rounded-[0.625rem]" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-44 rounded-full" />
      </div>
      <div className="px-5 pt-1 pb-5">
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

// loading.tsx de /emprendedoras y /promociones (Next envuelve la página en Suspense mientras el
// Server Component espera el fetch). role="status" + un texto en sr-only avisan a lectores de
// pantalla que algo está cargando; el resto del esqueleto es puramente visual (aria-hidden).
// Misma silueta que la página real (CLAUDE.md sección 6, regla 14): la franja de la cabecera, la barra de filtros
// superpuesta a su borde y la rejilla de tarjetas, para que al llegar el contenido no se desplace nada.
export function CatalogLoading({ etiqueta, variante = "emprendedora" }: PropsCatalogLoading) {
  return (
    <main className="flex-1">
      <div role="status">
        <span className="sr-only">{etiqueta}</span>
      </div>

      <div aria-hidden="true">
        <Skeleton className="aspect-[16/9] w-full rounded-none sm:aspect-[3/1] lg:aspect-[2732/590]" />

        <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} space-y-8 px-4 pt-0 pb-16 sm:px-6 lg:px-8`}>
          <div className="relative z-10 -mt-8 space-y-4 rounded-superficie border border-borde bg-superficie p-4 shadow-tarjeta-hover sm:p-5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_13rem_12.5rem] lg:grid-cols-[minmax(0,1fr)_14.5rem_15.5rem]">
              <Skeleton className="h-11 rounded-[0.625rem] sm:col-span-2 md:col-span-1" />
              <Skeleton className="h-11 rounded-[0.625rem]" />
              <Skeleton className="h-11 rounded-[0.625rem]" />
            </div>
            <div className="flex gap-2 overflow-hidden border-t border-borde pt-4">
              <Skeleton className="h-9 w-32 shrink-0 rounded-full" />
              <Skeleton className="h-9 w-36 shrink-0 rounded-full" />
              <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
              <Skeleton className="h-9 w-40 shrink-0 rounded-full" />
            </div>
          </div>

          {variante === "mercado" ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 rejilla:grid-cols-4">
              {Array.from({ length: 8 }).map((_, indice) => (
                <EsqueletoMercado key={indice} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 rejilla:grid-cols-3">
              {Array.from({ length: 6 }).map((_, indice) =>
                variante === "promocion" ? <EsqueletoPromocion key={indice} /> : <TarjetaEsqueleto key={indice} variante={variante} />,
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
