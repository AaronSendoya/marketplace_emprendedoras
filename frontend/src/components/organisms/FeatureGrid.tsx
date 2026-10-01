import { MapPin, MessageCircle, Percent, Store } from "lucide-react";
import type { ReactNode } from "react";

interface Caracteristica {
  icono: ReactNode;
  titulo: string;
}

const CARACTERISTICAS: Caracteristica[] = [
  { icono: <Store size={18} strokeWidth={1.5} aria-hidden="true" />, titulo: "Catálogo real" },
  { icono: <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />, titulo: "Contacto directo" },
  { icono: <Percent size={18} strokeWidth={1.5} aria-hidden="true" />, titulo: "Promociones vigentes" },
  { icono: <MapPin size={18} strokeWidth={1.5} aria-hidden="true" />, titulo: "Busca por ciudad y rubro" },
];

// Franja compacta de cierre, no una sección grande (antes tenía descripción propia por ítem y
// mucho más padding): con VitrinaEmprendedoras y VitrinaPromociones mostrando contenido real más
// arriba en la Home, esto pasa a ser un recordatorio breve, no la primera cosa que se ve.
export function FeatureGrid() {
  return (
    <section className="border-t border-borde bg-superficie">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-4 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
        {CARACTERISTICAS.map((caracteristica) => (
          <div key={caracteristica.titulo} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-acento-suave text-acento">
              {caracteristica.icono}
            </div>
            <h2 className="font-cuerpo text-sm font-semibold text-texto">{caracteristica.titulo}</h2>
          </div>
        ))}
      </div>
    </section>
  );
}
