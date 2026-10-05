"use client";

import { LayoutDashboard, LogOut, Menu, Store, Users, X } from "lucide-react";
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

// Tres ítems reales hoy: "Dashboard" (/admin/dashboard, vistazo general), "Cuentas" (/admin,
// /admin/nueva) y "Emprendimientos" (/admin/emprendimientos, administración de perfiles). Los demás
// (Promociones, Configuración) se suman cuando existan esas pantallas, no antes: un menú con
// enlaces muertos es peor que no tenerlo.
const ENLACES = [
  { href: "/admin/dashboard", etiqueta: "Dashboard", Icono: LayoutDashboard },
  { href: "/admin", etiqueta: "Cuentas", Icono: Users },
  { href: "/admin/emprendimientos", etiqueta: "Emprendimientos", Icono: Store },
];

// El href más largo que calce gana: "/admin" es prefijo de "/admin/emprendimientos", así que un
// simple "empieza con" encendería "Cuentas" también ahí.
function hrefActivo(pathname: string): string | undefined {
  const candidatos = ENLACES.filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  return candidatos.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

interface PropsContenido {
  pathname: string;
  nombreCompleto: string;
  onNavegar?: () => void;
}

// El menú lateral es la pieza de identidad del panel (sección 6, regla 13): el logo con presencia, la
// persona que administra como un bloque propio, separado de la navegación, y el elemento activo en
// magenta sólido (el color de la navegación, regla 2), no un simple fondo rosado.
function Contenido({ pathname, nombreCompleto, onNavegar }: PropsContenido) {
  return (
    <>
      {/* Solo la marca, no un enlace (mismo criterio que Navbar). `self-start`: este contenedor es
          `flex-col`, y su `align-items: stretch` por defecto estiraría el logo a lo ancho. */}
      <Image src="/logo/pista8-logo.png" alt="Pista 8" width={584} height={185} className="h-10 w-auto self-start" priority />

      <div className="mt-7 flex items-center gap-3 border-b border-borde px-1 pb-6">
        <Avatar nombreCompleto={nombreCompleto} tamano="lg" tono="acento" />
        <div className="min-w-0">
          <p className="font-cuerpo text-sm leading-tight font-semibold break-words text-texto">{nombreCompleto}</p>
          <p className="mt-0.5 font-cuerpo text-xs text-texto-secundario">Administrador</p>
        </div>
      </div>

      <div className="mt-7 flex-1">
        <p className="px-3 font-cuerpo text-xs font-semibold tracking-[0.1em] text-texto-secundario uppercase">Administración</p>
        <nav aria-label="Panel del Admin" className="mt-3 space-y-1">
          {ENLACES.map(({ href, etiqueta, Icono }) => {
            const activo = href === hrefActivo(pathname);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavegar}
                aria-current={activo ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 font-cuerpo text-sm transition-colors ${
                  activo ? "bg-acento font-semibold text-white" : "font-medium text-texto-secundario hover:bg-fondo hover:text-texto"
                } ${CLASES_FOCO_ENLACE}`}
              >
                <Icono size={20} strokeWidth={activo ? 2 : 1.75} aria-hidden="true" />
                {etiqueta}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sin "Ver el catálogo público": cerrar sesión ya saca del panel (pedido explícito, 2026-10-01). */}
      <div className="border-t border-borde pt-4">
        <form action={cerrarSesionAction}>
          <button
            type="submit"
            className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 font-cuerpo text-sm font-medium text-texto-secundario transition-colors hover:bg-fondo hover:text-acento ${CLASES_FOCO_ENLACE}`}
          >
            <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
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
      {/* Fija a la altura de la ventana (sticky + h-screen): el menú no se desplaza con la página, así que
          en una pantalla larga como el Dashboard "Cerrar sesión" sigue a la vista. `overflow-y-auto` solo
          entra en juego si la ventana es más baja que el propio menú, para no recortarlo. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start overflow-y-auto border-r border-borde bg-superficie px-4 py-7 lg:flex">
        <Contenido pathname={pathname} nombreCompleto={nombreCompleto} />
      </aside>

      <div className="flex h-16 items-center justify-between border-b border-borde bg-superficie pr-2 pl-4 lg:hidden">
        <Image src="/logo/pista8-logo.png" alt="Pista 8" width={584} height={185} className="h-9 w-auto" priority />
        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          aria-expanded={abierto}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className={`flex h-12 w-12 items-center justify-center rounded-md text-texto transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`}
        >
          {abierto ? <X size={24} strokeWidth={1.75} /> : <Menu size={24} strokeWidth={1.75} />}
        </button>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-texto/60" onClick={() => setAbierto(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-superficie px-4 py-7 shadow-lg">
            <Contenido pathname={pathname} nombreCompleto={nombreCompleto} onNavegar={() => setAbierto(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
