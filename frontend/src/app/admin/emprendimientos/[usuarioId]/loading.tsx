import { Skeleton } from "@/components/atoms/Skeleton";

export default function Cargando() {
  return (
    <div className="space-y-6">
      <div role="status">
        <span className="sr-only">Cargando el perfil</span>
      </div>

      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  );
}
