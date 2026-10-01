import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import type { Paginacion } from "@/lib/api/tipos";

interface PropsPaginador {
  paginacion: Paginacion;
  crearHref: (pagina: number) => string;
}

const CLASES_DESHABILITADO = `${clasesBoton("secundario")} pointer-events-none opacity-50`;

// Paginador simple (anterior/siguiente + número de página, sección 5.4 del plan): son enlaces
// normales con la página en la URL, así que no hace falta estado del navegador ni JS.
export function Paginador({ paginacion, crearHref }: PropsPaginador) {
  const totalPaginas = Math.max(1, Math.ceil(paginacion.total / paginacion.limite));
  if (totalPaginas <= 1) return null;

  const hayAnterior = paginacion.pagina > 1;
  const haySiguiente = paginacion.pagina < totalPaginas;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-4">
      {hayAnterior ? (
        <Link href={crearHref(paginacion.pagina - 1)} className={clasesBoton("secundario")}>
          Anterior
        </Link>
      ) : (
        <span aria-disabled="true" className={CLASES_DESHABILITADO}>
          Anterior
        </span>
      )}

      <span className="font-cuerpo text-sm text-texto-secundario">
        Página {paginacion.pagina} de {totalPaginas}
      </span>

      {haySiguiente ? (
        <Link href={crearHref(paginacion.pagina + 1)} className={clasesBoton("secundario")}>
          Siguiente
        </Link>
      ) : (
        <span aria-disabled="true" className={CLASES_DESHABILITADO}>
          Siguiente
        </span>
      )}
    </nav>
  );
}
