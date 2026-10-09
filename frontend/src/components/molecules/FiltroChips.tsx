import type { ReferenciaCatalogo } from "@/lib/api/tipos";
import { CLASES_FOCO_CONTROL } from "@/lib/estilos";

interface PropsFiltroChips {
  opciones: ReferenciaCatalogo[];
  valor: string;
  onChange: (valor: string) => void;
  etiquetaTodas?: string;
  // El color del chip elegido: naranja (por defecto) o púrpura, el de las promociones (CLAUDE.md sección 6, regla 14, punto l).
  tono?: "naranja" | "purpura";
}

// Cadenas completas para que Tailwind las encuentre.
const CLASES_SELECCIONADO = {
  naranja: "border-enfasis bg-enfasis font-semibold text-white",
  purpura: "border-secundario bg-secundario font-semibold text-white",
} as const;

// Atajo visual para elegir un rubro sin abrir el <Select> de FilterSelect, que sigue ahí con el
// control completo de ciudad + rubro; esto no lo reemplaza, lo complementa. Selección única: un
// clic sobre el chip ya elegido lo deselecciona (vuelve a "Todos"). El filtro activo va en naranja, el único
// color de acción del sitio público (CLAUDE.md sección 6, regla 2). En pantallas angostas los chips van en una
// sola fila con desplazamiento horizontal (`-mx-4 px-4` los alinea al borde de la barra al desplazarse);
// quien los contiene debe poder encogerse (`min-w-0`) o esa fila ensancharía toda la página.
export function FiltroChips({ opciones, valor, onChange, etiquetaTodas = "Todos", tono = "naranja" }: PropsFiltroChips) {
  return (
    <div
      className="flex min-w-0 gap-2 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-1 max-sm:[scrollbar-width:none] sm:flex-wrap max-sm:[&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Filtrar por rubro"
    >
      <Chip etiqueta={etiquetaTodas} seleccionado={valor === ""} onClick={() => onChange("")} tono={tono} />
      {opciones.map((opcion) => (
        <Chip
          key={opcion.id}
          etiqueta={opcion.nombre}
          seleccionado={valor === opcion.id}
          onClick={() => onChange(valor === opcion.id ? "" : opcion.id)}
          tono={tono}
        />
      ))}
    </div>
  );
}

interface PropsChip {
  etiqueta: string;
  seleccionado: boolean;
  onClick: () => void;
  tono: "naranja" | "purpura";
}

function Chip({ etiqueta, seleccionado, onClick, tono }: PropsChip) {
  const clasesEstado = seleccionado
    ? CLASES_SELECCIONADO[tono]
    : "border-borde-fuerte bg-superficie text-texto-secundario hover:border-texto-secundario hover:text-texto";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionado}
      className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.84rem] font-medium font-cuerpo whitespace-nowrap transition-colors ${clasesEstado} ${CLASES_FOCO_CONTROL}`}
    >
      {etiqueta}
    </button>
  );
}
