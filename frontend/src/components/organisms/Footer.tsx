import Link from "next/link";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

const ENLACES = [
  { href: "/emprendedoras", etiqueta: "Emprendedoras" },
  { href: "/productos", etiqueta: "Productos" },
  { href: "/promociones", etiqueta: "Promociones" },
];

// En ciruela, no en negro (CLAUDE.md sección 6, regla 2): el oscuro nace del tono magenta y púrpura del banner y
// los enlaces toman el naranja claro al pasar el cursor. Todo texto cumple 4,5:1 sobre ese fondo (13,2:1 el
// principal y 7,7:1 el tenue). El anillo de foco lleva el naranja claro y su separación toma el color del pie:
// el blanco por defecto se vería como un marco claro sobre el fondo oscuro.
const CLASES_ENLACE =
  "rounded-sm font-cuerpo text-sm text-pie-texto transition-colors outline-none hover:text-pie-acento hover:underline hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-pie-acento focus-visible:ring-offset-2 focus-visible:ring-offset-pie";

export function Footer() {
  const anioActual = new Date().getFullYear();

  return (
    <footer className="bg-pie text-pie-texto">
      <div className={`mx-auto flex ${CONTENEDOR_PUBLICO} flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8`}>
        <div>
          <p className="font-titulo text-lg font-extrabold text-white">Track de Mujeres</p>
          <p className="mt-1 font-cuerpo text-sm text-pie-tenue">Catálogo de emprendedoras y sus promociones.</p>
        </div>

        <nav aria-label="Pie de página">
          <ul className="flex flex-wrap gap-x-7 gap-y-2">
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
      <div className="border-t border-white/10">
        <p className={`mx-auto ${CONTENEDOR_PUBLICO} px-4 py-4 font-cuerpo text-[0.8125rem] text-pie-tenue sm:px-6 lg:px-8`}>© {anioActual} Track de Mujeres.</p>
      </div>
    </footer>
  );
}
