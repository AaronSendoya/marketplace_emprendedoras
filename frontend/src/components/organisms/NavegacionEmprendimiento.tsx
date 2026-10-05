import { Lock } from "lucide-react";
import Link from "next/link";
import { clasesChip } from "@/lib/estilos";

export type VistaEmprendimiento = "perfil" | "productos" | "descuentos";

export const VISTAS_EMPRENDIMIENTO: VistaEmprendimiento[] = ["perfil", "productos", "descuentos"];

interface PropsNavegacionEmprendimiento {
  vistaActiva: VistaEmprendimiento;
  // Sin perfil, Productos y Descuentos no se pueden usar todavía (pertenecen a un perfil): se ven,
  // bloqueadas, para que se entienda qué se habilita al crearlo.
  perfilCreado?: boolean;
}

const PESTANAS: { id: VistaEmprendimiento; etiqueta: string }[] = [
  { id: "perfil", etiqueta: "Perfil" },
  { id: "productos", etiqueta: "Productos" },
  { id: "descuentos", etiqueta: "Descuentos" },
];

// Subvistas del detalle de un emprendimiento: estado en la URL (`?vista=...`, "perfil" por
// defecto sin parámetro), mismo patrón que el resto del panel (AdminToolbar, SelectorPeriodo), así
// que cada pestaña es un <Link> normal, sin JS de cliente. Mismo lenguaje visual "pill" que
// FiltroChips/SelectorPeriodo, pero con semántica de pestañas real (cambia de sección, no filtra).
export function NavegacionEmprendimiento({ vistaActiva, perfilCreado = true }: PropsNavegacionEmprendimiento) {
  return (
    <div role="tablist" aria-label="Secciones del emprendimiento" className="flex flex-wrap gap-2">
      {PESTANAS.map((pestana) => {
        const activa = pestana.id === vistaActiva;
        if (!perfilCreado && pestana.id !== "perfil") {
          return (
            <span
              key={pestana.id}
              role="tab"
              aria-selected="false"
              aria-disabled="true"
              title="Disponible al crear el perfil"
              className="inline-flex min-h-11 cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-borde-fuerte bg-transparent px-4 py-1.5 font-cuerpo text-sm font-medium text-texto-secundario lg:min-h-10"
            >
              <Lock size={13} strokeWidth={1.75} aria-hidden="true" />
              {pestana.etiqueta}
              <span className="sr-only"> (disponible al crear el perfil)</span>
            </span>
          );
        }
        return (
          <Link
            key={pestana.id}
            href={pestana.id === "perfil" ? "?" : `?vista=${pestana.id}`}
            role="tab"
            aria-selected={activa}
            className={clasesChip(activa)}
          >
            {pestana.etiqueta}
          </Link>
        );
      })}
    </div>
  );
}
