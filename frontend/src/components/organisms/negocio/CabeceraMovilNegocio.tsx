"use client";

import Image from "next/image";
import { LogoMiniNegocio } from "./LogoMiniNegocio";
import { MenuCuentaNegocio } from "./MenuCuentaNegocio";

interface PropsCabeceraMovilNegocio {
  negocio: { nombre: string; logoUrl: string; paginaPublica: string } | null;
  nombrePersona: string;
}

// Cabecera de móvil y tablet (debajo de `lg`): mantiene a la vista de qué negocio es este panel en
// todas las pantallas. Sin perfil todavía no hay negocio que nombrar, así que muestra la marca.
export function CabeceraMovilNegocio({ negocio, nombrePersona }: PropsCabeceraMovilNegocio) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-borde bg-superficie pr-2 pl-4 lg:hidden">
      {negocio ? (
        <div className="flex min-w-0 items-center gap-3">
          <LogoMiniNegocio nombre={negocio.nombre} logoUrl={negocio.logoUrl} />
          <div className="min-w-0">
            <p className="font-cuerpo text-[10.5px] font-semibold tracking-wider text-texto-secundario uppercase">Mi negocio</p>
            <p className="truncate font-titulo text-[15px] font-bold text-texto">{negocio.nombre}</p>
          </div>
        </div>
      ) : (
        <Image src="/logo/pista8-logo.png" alt="Pista 8" width={584} height={185} className="h-8 w-auto" priority />
      )}
      <MenuCuentaNegocio nombrePersona={nombrePersona} paginaPublica={negocio?.paginaPublica ?? null} />
    </header>
  );
}
