import { Skeleton } from "@/components/atoms/Skeleton";

// Mismo criterio que el resto del sitio (paso 9): aviso a lectores de pantalla en un texto
// sr-only dentro de role="status", separado del esqueleto puramente visual.
export default function Cargando() {
  return (
    <div className="space-y-6">
      <div role="status">
        <span className="sr-only">Cargando cuentas</span>
      </div>

      <div aria-hidden="true" className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="overflow-hidden rounded-lg border border-borde">
          <div className="border-b border-borde p-4">
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-none" />
        </div>
      </div>
    </div>
  );
}
