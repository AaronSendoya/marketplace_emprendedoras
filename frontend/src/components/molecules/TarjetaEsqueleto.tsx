import { Skeleton } from "@/components/atoms/Skeleton";

interface PropsTarjetaEsqueleto {
  // "emprendedora": portada 16:9 con el logo cuadrado superpuesto y el nombre a su lado. "producto": imagen 4:3 sin logo.
  variante?: "emprendedora" | "producto";
}

// Misma silueta que EmprendedoraCard/ProductoCard (imagen, título, etiquetas, descripción y el pie), con las mismas
// medidas, para que el salto entre el esqueleto y la tarjeta real no desplace nada (CLS 0, CLAUDE.md sección 6, regla 14).
export function TarjetaEsqueleto({ variante = "emprendedora" }: PropsTarjetaEsqueleto) {
  const conLogo = variante === "emprendedora";

  return (
    <div className="@container flex h-full flex-col overflow-hidden rounded-superficie border border-borde bg-superficie shadow-tarjeta">
      <div className={`relative ${conLogo ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
        <Skeleton className="h-full w-full rounded-none" />
        {conLogo && (
          <Skeleton className="absolute bottom-0 left-5 h-[4.75rem] w-[4.75rem] translate-y-1/2 rounded-2xl border-[3px] border-superficie @min-[22rem]:h-[5.75rem] @min-[22rem]:w-[5.75rem]" />
        )}
      </div>

      <div className={`flex-1 space-y-3 px-5 pb-5 ${conLogo ? "pt-3.5" : "pt-[1.125rem]"}`}>
        {conLogo ? (
          <div className="min-h-[2.875rem] space-y-2 pl-[5.75rem] @min-[22rem]:pl-[6.75rem]">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        <div className="flex gap-2">
          {conLogo && <Skeleton className="h-6 w-20 rounded-full" />}
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <div className="flex gap-2 border-t border-borde px-5 py-3.5">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
    </div>
  );
}
