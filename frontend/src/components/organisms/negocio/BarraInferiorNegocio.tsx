"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { elementosNavegacion, hrefActivoNegocio } from "./elementosNavegacion";

interface PropsBarraInferiorNegocio {
  tienePerfil: boolean;
}

// Navegación de móvil y tablet (debajo de `lg`): perfil, productos y promociones a un toque, sin
// un sidebar de escritorio comprimido. Cada pestaña tiene ícono y texto (un ícono solo no dice
// "Promociones") y mide más de 44 px de alto.
export function BarraInferiorNegocio({ tienePerfil }: PropsBarraInferiorNegocio) {
  const pathname = usePathname();
  const elementos = elementosNavegacion(tienePerfil);
  const activo = hrefActivoNegocio(pathname, elementos);

  return (
    <nav
      aria-label="Mi negocio"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className={`grid ${elementos.length === 4 ? "grid-cols-4" : "grid-cols-2"}`}>
        {elementos.map(({ href, etiquetaCorta, Icono }) => {
          const esActivo = href === activo;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={esActivo ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 font-cuerpo text-xs transition-colors ${CLASES_FOCO_ENLACE} ${
                  esActivo ? "font-semibold text-acento shadow-[inset_0_2px_0_var(--color-acento)]" : "font-medium text-texto-secundario hover:text-texto"
                }`}
              >
                <Icono size={22} strokeWidth={1.6} aria-hidden="true" />
                {etiquetaCorta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
