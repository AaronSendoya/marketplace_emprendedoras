import { Skeleton } from "@/components/atoms/Skeleton";

// Mismo criterio que el resto del sitio: aviso a lectores de pantalla en un texto sr-only dentro de
// role="status", separado del esqueleto puramente visual. El esqueleto sigue la forma del inicio
// (identidad y tarjetas); las demás pantallas se parecen lo bastante.
export default function Cargando() {
  return (
    <div className="space-y-10">
      <div role="status">
        <span className="sr-only">Cargando tu negocio</span>
      </div>

      <div aria-hidden="true" className="space-y-10">
        <Skeleton className="h-72 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-7 w-64" />
          <div className="grid gap-4 xl:grid-cols-3">
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-52 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
