import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Select } from "@/components/atoms/Select";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";

interface PropsFilterSelect {
  opciones: ReferenciaCatalogo[];
  valor: string;
  etiquetaTodas: string;
  onChange: (valor: string) => void;
  ariaLabel: string;
  // Ancho y posición. En "base" va al propio <select>; en "catalogo", a su contenedor (el selector lo llena).
  className?: string;
  // "catalogo": el selector de la barra de filtros del sitio público (CLAUDE.md sección 6, regla 14): sin la
  // flecha nativa, con su propia flecha y un icono delante. Sin esto es el de siempre, que usa AdminToolbar y no
  // debe cambiar.
  variante?: "base" | "catalogo";
  // Icono delante (ya renderizado): el de ubicación para la ciudad y el de etiqueta para el rubro. Solo "catalogo".
  icono?: ReactNode;
}

// Traduce un catálogo del backend (ciudades, rubros) a las <option> de un Select genérico
// (sección 5.3 del plan: "Ciudad" → ciudad_id, "Rubro" → rubro_id).
export function FilterSelect({ opciones, valor, etiquetaTodas, onChange, ariaLabel, className, variante = "base", icono }: PropsFilterSelect) {
  const opcionesHtml = (
    <>
      <option value="">{etiquetaTodas}</option>
      {opciones.map((opcion) => (
        <option key={opcion.id} value={opcion.id}>
          {opcion.nombre}
        </option>
      ))}
    </>
  );

  if (variante === "catalogo") {
    return (
      <div className={`relative ${className ?? ""}`.trim()}>
        {icono && (
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-secundario">
            {icono}
          </span>
        )}
        <Select variante="catalogo" value={valor} onChange={(evento) => onChange(evento.target.value)} aria-label={ariaLabel}>
          {opcionesHtml}
        </Select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-texto-secundario"
        />
      </div>
    );
  }

  return (
    <Select value={valor} onChange={(evento) => onChange(evento.target.value)} aria-label={ariaLabel} className={className}>
      {opcionesHtml}
    </Select>
  );
}
