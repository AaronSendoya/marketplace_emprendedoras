import { Skeleton } from "@/components/atoms/Skeleton";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

interface PropsDetalleCargando {
  etiqueta: string;
  variante?: "perfil" | "producto";
}

// loading.tsx de /emprendedoras/[id] y /productos/[id]: misma silueta que el detalle real (migas de pan, portada o
// foto, título, etiquetas y el panel lateral). Igual que CatalogLoading, el aviso a lectores de pantalla va en un
// texto sr-only dentro de role="status", separado del esqueleto puramente visual (CLAUDE.md sección 6, regla 14).
export function DetalleCargando({ etiqueta, variante = "perfil" }: PropsDetalleCargando) {
  return (
    <main className={`mx-auto w-full ${CONTENEDOR_PUBLICO} flex-1 px-4 pb-16 sm:px-6 lg:px-8`}>
      <div role="status">
        <span className="sr-only">{etiqueta}</span>
      </div>

      <div aria-hidden="true">
        <div className="flex items-center gap-2 py-5 sm:py-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>

        {variante === "perfil" ? (
          <div className="space-y-6">
            <div className="rounded-superficie border border-borde bg-superficie shadow-tarjeta">
              <div className="relative">
                <Skeleton className="aspect-[16/9] w-full rounded-none rounded-t-superficie sm:aspect-[21/7]" />
                <Skeleton className="absolute bottom-0 left-5 h-[5.5rem] w-[5.5rem] translate-y-1/2 rounded-full border-4 border-superficie sm:left-8 sm:h-[6.5rem] sm:w-[6.5rem]" />
              </div>
              <div className="space-y-3 px-5 pt-16 pb-6 sm:px-8 sm:pt-[4.5rem]">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
              <Skeleton className="h-40 rounded-superficie" />
              <Skeleton className="h-48 rounded-superficie" />
            </div>
          </div>
        ) : (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <Skeleton className="aspect-[4/3] w-full rounded-superficie" />
            <div className="space-y-4 rounded-superficie border border-borde bg-superficie p-6 shadow-tarjeta sm:p-7">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
