"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { CLASES_FOCO_CONTROL, CLASES_FOCO_ENLACE, CONTENEDOR_PUBLICO } from "@/lib/estilos";

interface PropsNavbar {
  // El icono de sesión (SesionNavIcono, Server Component), pasado como prop desde el layout para no tener que
  // volver a hacer cliente la lectura de la sesión.
  sesion: ReactNode;
}

// Rutas de la sección 3 del plan que tienen sentido en la navegación global; los detalles (/emprendedoras/[id],
// /productos/[id]) se llegan desde las tarjetas, no desde aquí. "Inicio" es un enlace de texto más, no el logo (pedido
// explícito 2026-09-28: el logo deja de ser clicable). Tampoco hay un botón de CTA fijo en el Navbar (antes "Explorar la
// comunidad", redundante con "Emprendedoras"): el CTA de verdad vive en el Hero de la Landing. Client Component solo por el
// menú móvil y la sección activa (estado/ruta del navegador); el resto es estático.
const ENLACES = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/emprendedoras", etiqueta: "Emprendedoras" },
  { href: "/promociones", etiqueta: "Promociones" },
];

// Enlaces neutros; el activo va en negrita con un subrayado naranja (CLAUDE.md sección 6, regla 2: el magenta
// ya no es el color de la navegación). El subrayado crece desde el centro al pasar el cursor y ya está completo
// en la página actual: solo `transform`, que `prefers-reduced-motion` desactiva (regla 6). `after:bottom-0`
// sobre un enlace que ocupa todo el alto de la barra deja la línea justo sobre su borde inferior.
const CLASES_ENLACE =
  "relative inline-flex h-full items-center font-cuerpo text-[0.9375rem] font-medium text-texto-secundario transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-marca after:transition-transform after:duration-300 hover:text-texto hover:after:scale-x-100 aria-[current=page]:font-semibold aria-[current=page]:text-texto aria-[current=page]:after:scale-x-100";

export function Navbar({ sesion }: PropsNavbar) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  // "/" solo coincide exacto: todas las rutas empiezan por "/". Las demás también cuentan sus subrutas (el
  // detalle de un perfil enciende "Emprendedoras").
  function estaActivo(href: string): boolean {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  // Escape cierra el menú móvil (mismo patrón que los modales).
  useEffect(() => {
    if (!abierto) return;
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [abierto]);

  return (
    <header className="sticky top-0 z-40 border-b border-borde bg-superficie shadow-[0_1px_2px_rgb(28_25_23/0.04)]">
      <div className={`mx-auto flex h-[3.875rem] ${CONTENEDOR_PUBLICO} items-center justify-between gap-4 px-4 sm:px-6 md:h-[4.25rem] lg:px-8`}>
        {/* Solo la marca, no un enlace: "Inicio" ya cubre la navegación a "/" como un enlace de
            texto normal, junto a Emprendedoras y Promociones. `priority`: está en el primer pantallazo de
            toda página pública. */}
        <Image src="/logo/pista8-logo.png" alt="Pista 8" width={584} height={185} priority className="h-10 w-auto shrink-0 sm:h-[2.875rem]" />

        <nav aria-label="Principal" className="hidden h-full items-center gap-8 md:flex">
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={estaActivo(enlace.href) ? "page" : undefined}
              className={`${CLASES_ENLACE} ${CLASES_FOCO_ENLACE}`}
            >
              {enlace.etiqueta}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {sesion}

          <button
            type="button"
            onClick={() => setAbierto((valor) => !valor)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-borde-fuerte bg-superficie text-texto-secundario transition-colors hover:bg-fondo hover:text-texto md:hidden ${CLASES_FOCO_CONTROL}`}
            aria-expanded={abierto}
            aria-controls="menu-movil"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          >
            {abierto ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {abierto && (
        <nav id="menu-movil" aria-label="Principal (móvil)" className="animate-aparecer border-t border-borde bg-superficie px-4 py-2 md:hidden">
          <ul>
            {ENLACES.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  onClick={() => setAbierto(false)}
                  aria-current={estaActivo(enlace.href) ? "page" : undefined}
                  className={`flex min-h-12 items-center border-l-2 border-transparent pl-3 font-cuerpo text-base font-medium text-texto-secundario transition-colors hover:text-texto aria-[current=page]:border-marca aria-[current=page]:font-semibold aria-[current=page]:text-texto ${CLASES_FOCO_ENLACE}`}
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
