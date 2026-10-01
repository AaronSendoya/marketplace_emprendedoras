import type { ReferenciaCatalogo } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface PropsFiltroChips {
  opciones: ReferenciaCatalogo[];
  valor: string;
  onChange: (valor: string) => void;
  etiquetaTodas?: string;
}

// Atajo visual para elegir un rubro sin abrir el <Select> de FilterSelect, que sigue ahí con el
// control completo de ciudad + rubro; esto no lo reemplaza, lo complementa. Selección única: un
// clic sobre el chip ya elegido lo deselecciona (vuelve a "Todos"). Estado seleccionado en
// púrpura (CLAUDE.md sección 6, regla 2: "estados seleccionados").
export function FiltroChips({ opciones, valor, onChange, etiquetaTodas = "Todos" }: PropsFiltroChips) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por rubro">
      <Chip etiqueta={etiquetaTodas} seleccionado={valor === ""} onClick={() => onChange("")} />
      {opciones.map((opcion) => (
        <Chip
          key={opcion.id}
          etiqueta={opcion.nombre}
          seleccionado={valor === opcion.id}
          onClick={() => onChange(valor === opcion.id ? "" : opcion.id)}
        />
      ))}
    </div>
  );
}

interface PropsChip {
  etiqueta: string;
  seleccionado: boolean;
  onClick: () => void;
}

function Chip({ etiqueta, seleccionado, onClick }: PropsChip) {
  const clasesEstado = seleccionado
    ? "border-secundario bg-secundario text-white"
    : "border-borde bg-superficie text-texto-secundario hover:border-secundario hover:text-secundario";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionado}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium font-cuerpo transition-colors ${clasesEstado} ${CLASES_FOCO_ENLACE}`}
    >
      {etiqueta}
    </button>
  );
}
