"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface PropsNavbar {
  // Server Component (SesionNavIcono) pasado ya renderizado desde layout.tsx: el Navbar es
  // Client Component (menú móvil, sección activa) y no puede leer la cookie de sesión él mismo,
  // pero sí recibir el resultado ya resuelto como children/prop.
  sesion: ReactNode;
}

// Rutas de la sección 3 del plan que tienen sentido en la navegación global; los detalles
// (/emprendedoras/[id], /productos/[id]) se llegan desde las tarjetas, no desde aquí. "Inicio" es
// un enlace de texto más, no el logo (pedido explícito 2026-09-28: el logo deja de ser clicable,
// ver más abajo).
const ENLACES = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/emprendedoras", etiqueta: "Emprendedoras" },
  { href: "/promociones", etiqueta: "Promociones" },
];

// Ya no hay un botón de CTA fijo en el Navbar (antes "Explorar la comunidad", que apuntaba al
// mismo lugar que el enlace "Emprendedoras" — redundante en toda la app, y directamente
// incoherente al estar ya dentro de /emprendedoras, pedido explícito 2026-09-28). En su lugar, el
// enlace de la sección activa se resalta, así siempre queda claro dónde estás sin duplicar nada:
// el CTA de verdad vive en el Hero de la Landing, donde sí tiene sentido como acción principal.
function clasesEnlace(activo: boolean): string {
  const color = activo ? "font-semibold text-acento" : "text-texto-secundario hover:text-acento";
  return `font-cuerpo text-sm transition-colors ${color} ${CLASES_FOCO_ENLACE}`;
}

// Client Component solo por el menú móvil y la sección activa (estado/ruta del navegador, igual
// que un buscador o un modal, sección 2 del plan de decisiones técnicas); el resto es estático.
export function Navbar({ sesion }: PropsNavbar) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  function estaActivo(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Cierra el menú móvil con Escape, como cualquier panel desplegable (navegable por teclado,
  // sección 7 de los lineamientos de diseño).
  useEffect(() => {
    if (!abierto) return;
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [abierto]);

  return (
    <header className="sticky top-0 z-40 border-b border-borde bg-superficie">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Solo la marca, no un enlace: "Inicio" ya cubre la navegación a "/" como un enlace de
            texto normal, junto a Emprendedoras y Promociones (pedido explícito 2026-09-28). */}
        <Image
          src="/logo/pista8-logo.png"
          alt="Pista 8"
          width={584}
          height={185}
          priority
          className="h-11 w-auto shrink-0 sm:h-12"
        />

        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={estaActivo(enlace.href) ? "page" : undefined}
              className={clasesEnlace(estaActivo(enlace.href))}
            >
              {enlace.etiqueta}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {sesion}

          <button
            type="button"
            onClick={() => setAbierto((valor) => !valor)}
            className={`inline-flex items-center justify-center rounded-md p-2.5 text-texto transition-colors hover:text-acento md:hidden ${CLASES_FOCO_ENLACE}`}
            aria-expanded={abierto}
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          >
            {abierto ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {abierto && (
        <nav aria-label="Principal (móvil)" className="border-t border-borde bg-superficie px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-4">
            {ENLACES.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  onClick={() => setAbierto(false)}
                  aria-current={estaActivo(enlace.href) ? "page" : undefined}
                  className={`block ${clasesEnlace(estaActivo(enlace.href))}`}
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
