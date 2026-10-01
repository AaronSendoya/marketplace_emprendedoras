import { Select } from "@/components/atoms/Select";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";

interface PropsFilterSelect {
  opciones: ReferenciaCatalogo[];
  valor: string;
  etiquetaTodas: string;
  onChange: (valor: string) => void;
  ariaLabel: string;
  className?: string;
}

// Traduce un catálogo del backend (ciudades, rubros) a las <option> de un Select genérico
// (sección 5.3 del plan: "Ciudad" → ciudad_id, "Rubro" → rubro_id).
export function FilterSelect({ opciones, valor, etiquetaTodas, onChange, ariaLabel, className }: PropsFilterSelect) {
  return (
    <Select
      value={valor}
      onChange={(evento) => onChange(evento.target.value)}
      aria-label={ariaLabel}
      className={className}
    >
      <option value="">{etiquetaTodas}</option>
      {opciones.map((opcion) => (
        <option key={opcion.id} value={opcion.id}>
          {opcion.nombre}
        </option>
      ))}
    </Select>
  );
}
