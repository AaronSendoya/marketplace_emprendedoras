import { MapPin, MessageCircle, Percent, Store } from "lucide-react";
import type { ReactNode } from "react";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

interface Caracteristica {
  icono: ReactNode;
  titulo: string;
}

// Iconos solo donde aportan significado (CLAUDE.md sección 6, regla 5): cada uno acompaña a lo que nombra.
const CARACTERISTICAS: Caracteristica[] = [
  { icono: <Store size={20} strokeWidth={1.75} aria-hidden="true" />, titulo: "Catálogo real" },
  { icono: <MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />, titulo: "Contacto directo" },
  { icono: <Percent size={20} strokeWidth={1.75} aria-hidden="true" />, titulo: "Promociones vigentes" },
  { icono: <MapPin size={20} strokeWidth={1.75} aria-hidden="true" />, titulo: "Busca por ciudad y rubro" },
];

// Franja compacta de cierre, no una sección grande: con VitrinaEmprendedoras y VitrinaPromociones mostrando contenido
// real más arriba en la Home, esto es un recordatorio breve, no lo primero que se ve. Regla 14: una superficie blanca
// entre dos bordes, entre la banda de promociones y el pie.
// Cada ventaja lleva su icono en una ficha de naranja tenue (el icono en el naranja de marca, que sobre ese
// fondo da 3,4:1, suficiente para un elemento gráfico). En una columna debajo de `sm`, en dos desde `sm` y
// en cuatro, separadas por una línea fina, desde `lg`.
export function FeatureGrid() {
  return (
    <section className="border-y border-borde bg-superficie">
      <div className={`mx-auto grid w-full ${CONTENEDOR_PUBLICO} grid-cols-1 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8`}>
        {CARACTERISTICAS.map((caracteristica) => (
          <div
            key={caracteristica.titulo}
            className="flex items-center gap-3 border-t border-borde py-5 first:border-t-0 sm:py-6 sm:[&:nth-child(2)]:border-t-0 lg:border-t-0 lg:border-l lg:px-6 lg:first:border-l-0 lg:first:pl-0"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.625rem] border border-enfasis-borde bg-enfasis-suave text-marca">
              {caracteristica.icono}
            </div>
            <h2 className="font-cuerpo text-[0.9rem] leading-snug font-semibold text-texto">{caracteristica.titulo}</h2>
          </div>
        ))}
      </div>
    </section>
  );
}
