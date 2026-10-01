import { Skeleton } from "@/components/atoms/Skeleton";

export default function Cargando() {
  return (
    <div className="space-y-6">
      <div role="status">
        <span className="sr-only">Cargando emprendimientos</span>
      </div>

      <div aria-hidden="true" className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
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
