import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import type { Paginacion } from "@/lib/api/tipos";

interface PropsPaginador {
  paginacion: Paginacion;
  crearHref: (pagina: number) => string;
  // Botones de 44 px de alto debajo de `lg` (sección 6, regla 12). Solo lo activa el panel del
  // Admin: el catálogo público usa el tamaño de siempre.
  tactil?: boolean;
  // El paginador de las páginas públicas (CLAUDE.md sección 6, regla 14): dentro de una superficie con borde y
  // sombra, con los botones de contorno y la página en el centro. Sin esto es el del Admin, de siempre.
  superficie?: boolean;
}

const CLASES_TACTIL = "min-h-11 lg:min-h-0";

// Paginador simple (anterior/siguiente + número de página, sección 5.4 del plan): son enlaces
// normales con la página en la URL, así que no hace falta estado del navegador ni JS.
export function Paginador({ paginacion, crearHref, tactil = false, superficie = false }: PropsPaginador) {
  const totalPaginas = Math.max(1, Math.ceil(paginacion.total / paginacion.limite));
  if (totalPaginas <= 1) return null;

  const clasesBotonPaginador = superficie ? clasesBoton("contorno", "", "compacto") : clasesBoton("secundario", tactil ? CLASES_TACTIL : "");
  const clasesDeshabilitado = `${clasesBotonPaginador} pointer-events-none opacity-50`;
  const hayAnterior = paginacion.pagina > 1;
  const haySiguiente = paginacion.pagina < totalPaginas;

  return (
    <nav
      aria-label="Paginación"
      className={
        superficie
          ? "flex items-center justify-between gap-3 rounded-superficie border border-borde bg-superficie px-3.5 py-2.5 shadow-tarjeta"
          : "flex items-center justify-center gap-4"
      }
    >
      {hayAnterior ? (
        <Link href={crearHref(paginacion.pagina - 1)} className={clasesBotonPaginador}>
          Anterior
        </Link>
      ) : (
        <span aria-disabled="true" className={clasesDeshabilitado}>
          Anterior
        </span>
      )}

      <span className="font-cuerpo text-sm text-texto-secundario">
        Página {paginacion.pagina} de {totalPaginas}
      </span>

      {haySiguiente ? (
        <Link href={crearHref(paginacion.pagina + 1)} className={clasesBotonPaginador}>
          Siguiente
        </Link>
      ) : (
        <span aria-disabled="true" className={clasesDeshabilitado}>
          Siguiente
        </span>
      )}
    </nav>
  );
}
