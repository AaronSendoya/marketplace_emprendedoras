import { Skeleton } from "@/components/atoms/Skeleton";
import { TarjetaEsqueleto } from "@/components/molecules/TarjetaEsqueleto";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

// loading.tsx de /promociones/[id]: la misma silueta que el detalle real (migas de pan, el recuadro del descuento y la rejilla de productos), para
// que al llegar el contenido no se desplace nada. El aviso a lectores de pantalla va en un texto sr-only dentro de role="status", como el resto.
export default function Cargando() {
  return (
    <main className={`mx-auto w-full ${CONTENEDOR_PUBLICO} flex-1 px-4 pb-16 sm:px-6 lg:px-8`}>
      <div role="status">
        <span className="sr-only">Cargando promoción</span>
      </div>

      <div aria-hidden="true">
        <div className="flex items-center gap-2 py-5 sm:py-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid items-center gap-6 rounded-superficie border border-borde bg-superficie p-6 shadow-tarjeta sm:p-8 md:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8">
          <Skeleton className="size-28 rounded-[1.375rem] sm:size-[8.25rem]" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full max-w-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-56 rounded-full" />
          </div>
          <div className="space-y-2.5 md:col-span-2 lg:col-span-1 lg:w-64">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>

        <div className="mt-10 mb-5 sm:mt-12">
          <Skeleton className="h-7 w-72 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 rejilla:grid-cols-3">
          {Array.from({ length: 3 }).map((_, indice) => (
            <TarjetaEsqueleto key={indice} variante="producto" />
          ))}
        </div>
      </div>
    </main>
  );
}
