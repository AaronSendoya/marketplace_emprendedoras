import { Skeleton } from "@/components/atoms/Skeleton";
import { TarjetaEsqueleto } from "@/components/molecules/TarjetaEsqueleto";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

interface PropsVitrinaEsqueleto {
  variante: "emprendedora" | "producto";
  // La banda de promociones va sobre el fondo profundo y entre dos bordes, como la vitrina real.
  banda?: boolean;
}

// Lo que se ve en lugar de una vitrina del Inicio mientras sus datos llegan (CLAUDE.md sección 6, regla 14): el
// Inicio pinta el banner y el menú de inmediato y deja las vitrinas en un `Suspense`. Tiene las mismas medidas
// que la vitrina final (encabezado y tres tarjetas) para que, al llegar, nada se desplace. Puramente visual.
export function VitrinaEsqueleto({ variante, banda = false }: PropsVitrinaEsqueleto) {
  return (
    <section aria-hidden="true" className={banda ? "border-y border-borde bg-fondo-profundo" : ""}>
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} space-y-8 px-4 py-14 sm:px-6 sm:py-16 lg:px-8`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-4 w-60 max-w-full" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 rejilla:grid-cols-3">
          {Array.from({ length: 3 }).map((_, indice) => (
            <TarjetaEsqueleto key={indice} variante={variante} />
          ))}
        </div>
      </div>
    </section>
  );
}
