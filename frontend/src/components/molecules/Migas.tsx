import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface ItemMiga {
  etiqueta: string;
  // Sin `href`, es la página actual.
  href?: string;
}

interface PropsMigas {
  items: ItemMiga[];
}

// Migas de pan de las páginas de detalle (CLAUDE.md sección 6, regla 14): reemplazan al enlace suelto "← Volver a…".
// Los enlaces van en magenta, que es el color de los enlaces de texto (regla 2); la página actual en tinta y
// negrita. Un nombre largo se corta con puntos suspensivos en vez de empujar la fila.
export function Migas({ items }: PropsMigas) {
  return (
    <nav aria-label="Migas de pan" className="py-5 sm:py-6">
      <ol className="flex flex-wrap items-center gap-1.5 font-cuerpo text-sm">
        {items.map((item, indice) => (
          <li key={item.etiqueta} className="flex min-w-0 items-center gap-1.5">
            {indice > 0 && <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-texto-secundario" />}
            {item.href ? (
              <Link href={item.href} className={`font-medium text-acento hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE}`}>
                {item.etiqueta}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-semibold text-texto">
                {item.etiqueta}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
