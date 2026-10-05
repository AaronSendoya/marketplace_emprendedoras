"use client";

import { ExternalLink, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/atoms/Avatar";
import { cerrarSesionAction } from "@/lib/auth/acciones";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { elementosNavegacion, hrefActivoNegocio } from "./elementosNavegacion";
import { LogoMiniNegocio } from "./LogoMiniNegocio";

interface PropsRielNegocio {
  // `null` hasta que la emprendedora crea su perfil: sin negocio no hay identidad que mostrar ni
  // página pública a la que ir.
  negocio: { nombre: string; logoUrl: string; paginaPublica: string } | null;
  nombrePersona: string;
}

const CLASES_ITEM = `flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 text-left font-cuerpo transition-colors ${CLASES_FOCO_ENLACE}`;
const CLASES_ITEM_SECUNDARIO = `${CLASES_ITEM} border-transparent text-sm font-medium text-texto-secundario hover:bg-superficie/70 hover:text-texto`;

// Navegación lateral de escritorio (desde `lg`; debajo de eso la reemplaza BarraInferiorNegocio).
// A propósito no se parece al sidebar del Admin: fondo cálido sin borde, la identidad del negocio
// en vez de la de la persona, y una pastilla blanca en vez de una barra lateral para lo activo.
export function RielNegocio({ negocio, nombrePersona }: PropsRielNegocio) {
  const pathname = usePathname();
  const elementos = elementosNavegacion(negocio !== null);
  const activo = hrefActivoNegocio(pathname, elementos);

  return (
    <aside className="hidden w-64 shrink-0 bg-riel lg:block">
      <div className="sticky top-0 flex h-screen flex-col overflow-y-auto px-4 py-7">
        <Image src="/logo/pista8-logo.png" alt="Pista 8" width={584} height={185} className="h-8 w-auto self-start px-2" priority />

        <div className="mt-7 flex items-center gap-3 px-2">
          {negocio ? (
            <>
              <LogoMiniNegocio nombre={negocio.nombre} logoUrl={negocio.logoUrl} />
              <div className="min-w-0">
                <p className="font-cuerpo text-[11px] font-semibold tracking-wider text-texto-secundario uppercase">Mi negocio</p>
                <p className="truncate font-titulo text-sm font-bold text-texto">{negocio.nombre}</p>
              </div>
            </>
          ) : (
            <>
              <Avatar nombreCompleto={nombrePersona} tamano="md" />
              <div className="min-w-0">
                <p className="truncate font-titulo text-sm font-bold text-texto">{nombrePersona}</p>
                <p className="font-cuerpo text-xs text-texto-secundario">Emprendedora</p>
              </div>
            </>
          )}
        </div>

        <nav aria-label="Mi negocio" className="mt-6 flex flex-col gap-0.5">
          {elementos.map(({ href, etiqueta, Icono }) => {
            const esActivo = href === activo;
            return (
              <Link
                key={href}
                href={href}
                aria-current={esActivo ? "page" : undefined}
                className={`${CLASES_ITEM} text-[15px] ${
                  esActivo
                    ? "border-borde bg-superficie font-semibold text-acento shadow-[0_1px_2px_rgba(28,25,23,0.06)]"
                    : "border-transparent font-medium text-texto-secundario hover:bg-superficie/70 hover:text-texto"
                }`}
              >
                <Icono size={20} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
                {etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 flex flex-col gap-0.5 border-t border-texto/10 pt-4">
          {negocio && (
            <Link href={negocio.paginaPublica} target="_blank" rel="noopener noreferrer" className={CLASES_ITEM_SECUNDARIO}>
              <ExternalLink size={18} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
              Ver mi página pública
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </Link>
          )}
          <form action={cerrarSesionAction}>
            <button type="submit" className={CLASES_ITEM_SECUNDARIO}>
              <LogOut size={18} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
