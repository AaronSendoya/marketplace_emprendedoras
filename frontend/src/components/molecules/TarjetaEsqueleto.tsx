import { Skeleton } from "@/components/atoms/Skeleton";

// Misma silueta que EmprendedoraCard/ProductoCard (imagen + título + un par de líneas), para que
// el salto entre el esqueleto y la tarjeta real se note lo menos posible.
export function TarjetaEsqueleto() {
  return (
    <div className="overflow-hidden rounded-lg border border-borde bg-superficie">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
