import Link from "next/link";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

const ENLACES = [
  { href: "/emprendedoras", etiqueta: "Emprendedoras" },
  { href: "/promociones", etiqueta: "Promociones" },
];

const CLASES_ENLACE = `font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`;

export function Footer() {
  const anioActual = new Date().getFullYear();

  return (
    <footer className="border-t border-borde bg-superficie">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="font-titulo text-base font-bold text-texto">Track de Mujeres</p>
          <p className="mt-1 font-cuerpo text-sm text-texto-secundario">Catálogo de emprendedoras y sus promociones.</p>
        </div>

        <nav aria-label="Pie de página">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {ENLACES.map((enlace) => (
              <li key={enlace.href}>
                <Link href={enlace.href} className={CLASES_ENLACE}>
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* El acceso a "Iniciar sesión"/"Cerrar sesión" se movió al Navbar como ícono (pedido
          explícito 2026-10-01: ni en el Navbar como texto, ni en el footer — un ícono discreto en
          el Navbar, ver SesionNavIcono). No se deja en los dos lugares a la vez, para no repetir
          el mismo problema de duplicación que ya corregimos con el botón "Explorar la comunidad". */}
      <div className="border-t border-borde px-4 py-4 sm:px-6 lg:px-8">
        <p className="font-cuerpo text-xs text-texto-secundario">© {anioActual} Track de Mujeres.</p>
      </div>
    </footer>
  );
}
