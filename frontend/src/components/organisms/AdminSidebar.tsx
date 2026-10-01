"use client";

import { ArrowLeft, LogOut, Menu, Store, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/atoms/Avatar";
import { cerrarSesionAction } from "@/lib/auth/acciones";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface PropsAdminSidebar {
  nombreCompleto: string;
}

// Dos ítems reales hoy: "Cuentas" (/admin, /admin/nueva) y "Emprendimientos" (/admin/emprendimientos,
// administración de perfiles). Los demás (Promociones, Configuración) se suman cuando existan esas
// pantallas, no antes — un sidebar con enlaces muertos es peor que no tenerlo.
const ENLACES = [
  { href: "/admin", etiqueta: "Cuentas", Icono: Users },
  { href: "/admin/emprendimientos", etiqueta: "Emprendimientos", Icono: Store },
];

// El href más largo que calce gana: "/admin" es prefijo de "/admin/emprendimientos", así que un
// simple "empieza con" encendería "Cuentas" también ahí. Con dos ítems reales conviene resolverlo
// de forma genérica en vez de enumerar a mano las subrutas de cada uno.
function hrefActivo(pathname: string): string | undefined {
  const candidatos = ENLACES.filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  return candidatos.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

interface PropsContenido {
  pathname: string;
  nombreCompleto: string;
  onNavegar?: () => void;
}

function Contenido({ pathname, nombreCompleto, onNavegar }: PropsContenido) {
  return (
    <>
      {/* Solo la marca, no un enlace (mismo criterio que Navbar): la navegación va en botones
          explícitos, no escondida detrás del logo. `self-start`: este `<aside>` es un contenedor
          `flex-col`, cuyo `align-items: stretch` por defecto estira el logo a lo ancho del sidebar
          en vez de respetar su proporción (por eso se veía bien en el panel móvil, que usa
          `items-center`, y mal acá — ya corregido). */}
      <Image src="/logo/pista8-logo.png" alt="Pista 8" width={584} height={185} className="h-8 w-auto self-start" />

      <div className="mt-8 flex-1">
        <p className="px-3 font-cuerpo text-xs font-semibold tracking-wide text-texto-secundario uppercase">Administración</p>
        <nav aria-label="Panel del Admin" className="mt-3 space-y-1">
          {ENLACES.map(({ href, etiqueta, Icono }) => {
            const activo = href === hrefActivo(pathname);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavegar}
                aria-current={activo ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2 font-cuerpo text-sm transition-colors ${
                  activo
                    ? "border-acento bg-acento-suave font-semibold text-acento"
                    : "border-transparent text-texto-secundario hover:bg-fondo hover:text-texto"
                } ${CLASES_FOCO_ENLACE}`}
              >
                <Icono size={18} strokeWidth={1.5} aria-hidden="true" />
                {etiqueta}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Salida del panel, no un ítem más de navegación: sin el borde izquierdo ni el tratamiento
          activo que usa `nav`, y en su propia sección separada por un borde. */}
      <div className="border-t border-borde pt-4">
        <Link
          href="/"
          onClick={onNavegar}
          className={`flex items-center gap-3 rounded-md px-3 py-2 font-cuerpo text-sm text-texto-secundario transition-colors hover:bg-fondo hover:text-texto ${CLASES_FOCO_ENLACE}`}
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          Ver el catálogo público
        </Link>
      </div>

      <div className="space-y-3 border-t border-borde pt-4">
        <div className="flex items-center gap-2.5 px-3">
          <Avatar nombreCompleto={nombreCompleto} />
          <div className="min-w-0">
            <p className="truncate font-cuerpo text-sm font-medium text-texto">{nombreCompleto}</p>
            <p className="font-cuerpo text-xs text-texto-secundario">Administrador</p>
          </div>
        </div>
        <form action={cerrarSesionAction}>
          <button
            type="submit"
            className={`flex w-full items-center gap-3 rounded-md px-3 py-1.5 font-cuerpo text-xs text-texto-secundario transition-colors hover:bg-fondo hover:text-acento ${CLASES_FOCO_ENLACE}`}
          >
            <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}

// Layout propio del panel del Admin (ver SiteChrome: nada de Navbar/Footer públicos acá). Mismo
// patrón de menú móvil que Navbar (Escape para cerrar, overlay + panel deslizante).
export function AdminSidebar({ nombreCompleto }: PropsAdminSidebar) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [abierto]);

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-borde bg-superficie px-4 py-6 md:flex">
        <Contenido pathname={pathname} nombreCompleto={nombreCompleto} />
      </aside>

      <div className="flex items-center justify-between border-b border-borde bg-superficie px-4 py-3 md:hidden">
        <Image src="/logo/pista8-logo.png" alt="Pista 8" width={584} height={185} className="h-8 w-auto" />
        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          aria-expanded={abierto}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className={`rounded-md p-2.5 text-texto transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`}
        >
          {abierto ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
        </button>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-texto/60" onClick={() => setAbierto(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-superficie px-4 py-6 shadow-lg">
            <Contenido pathname={pathname} nombreCompleto={nombreCompleto} onNavegar={() => setAbierto(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
