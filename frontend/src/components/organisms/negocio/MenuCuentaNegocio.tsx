"use client";

import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/atoms/Avatar";
import { cerrarSesionAction } from "@/lib/auth/acciones";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface PropsMenuCuentaNegocio {
  nombrePersona: string;
  // `null` mientras no hay perfil: no existe todavía una página pública que ver.
  paginaPublica: string | null;
}

const CLASES_ITEM =
  "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left font-cuerpo text-[15px] font-medium text-texto transition-colors hover:bg-fondo focus-visible:bg-fondo focus-visible:outline-none";

// Lo que en escritorio vive al pie del riel (ver la página pública, cerrar sesión), en móvil queda
// en un menú de cuenta chico en la cabecera: la barra inferior se reserva para las tres secciones.
// Mismo comportamiento que los demás menús del panel (Escape y clic afuera cierran), y además
// devuelve el foco al botón y lleva el foco al menú al abrirlo.
export function MenuCuentaNegocio({ nombrePersona, paginaPublica }: PropsMenuCuentaNegocio) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    menuRef.current?.focus();

    function alHacerClicFuera(evento: PointerEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) setAbierto(false);
    }
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      setAbierto(false);
      disparadorRef.current?.focus();
    }
    document.addEventListener("pointerdown", alHacerClicFuera);
    window.addEventListener("keydown", alPresionarTecla);
    return () => {
      document.removeEventListener("pointerdown", alHacerClicFuera);
      window.removeEventListener("keydown", alPresionarTecla);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={disparadorRef}
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Mi cuenta"
        className={`flex h-11 w-11 items-center justify-center rounded-full ${CLASES_FOCO_ENLACE}`}
      >
        <Avatar nombreCompleto={nombrePersona} />
      </button>

      {abierto && (
        <div
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          className="absolute top-full right-0 z-40 mt-1 w-64 rounded-xl border border-borde bg-superficie p-1.5 shadow-lg focus:outline-none"
        >
          <div className="mb-1 border-b border-borde px-3 pt-2 pb-2.5">
            <p className="truncate font-cuerpo text-sm font-semibold text-texto">{nombrePersona}</p>
            <p className="font-cuerpo text-xs text-texto-secundario">Emprendedora</p>
          </div>

          {paginaPublica && (
            <Link href={paginaPublica} target="_blank" rel="noopener noreferrer" role="menuitem" className={CLASES_ITEM}>
              <ExternalLink size={18} strokeWidth={1.6} aria-hidden="true" className="shrink-0 text-texto-secundario" />
              Ver mi página pública
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </Link>
          )}
          <form action={cerrarSesionAction}>
            <button type="submit" role="menuitem" className={CLASES_ITEM}>
              <LogOut size={18} strokeWidth={1.6} aria-hidden="true" className="shrink-0 text-texto-secundario" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
