import { Check } from "lucide-react";

export type PasoImportacion = "subir" | "revisar" | "importar" | "resultado";

const PASOS: { id: PasoImportacion; nombre: string }[] = [
  { id: "subir", nombre: "Subir" },
  { id: "revisar", nombre: "Revisar" },
  { id: "importar", nombre: "Importar" },
  { id: "resultado", nombre: "Resultado" },
];

// Los cuatro pasos de la importación, siempre visibles arriba (regla 22): el actual resaltado y los hechos con una marca. Desde
// `md`, cada paso es una pastilla; debajo, el número con su nombre debajo, para que quepan los cuatro sin desbordar.
export function IndicadorDePasos({ actual }: { actual: PasoImportacion }) {
  const indice = PASOS.findIndex((paso) => paso.id === actual);

  return (
    <ol aria-label="Pasos de la importación" className="grid grid-cols-4 gap-2">
      {PASOS.map((paso, i) => {
        const hecho = i < indice;
        const esActual = i === indice;
        return (
          <li
            key={paso.id}
            aria-current={esActual ? "step" : undefined}
            className={`flex min-w-0 flex-col items-center gap-1.5 text-center font-cuerpo text-xs md:flex-row md:gap-3 md:rounded-lg md:border md:px-3.5 md:py-2.5 md:text-left md:text-sm ${
              esActual ? "font-semibold text-texto md:border-acento md:bg-acento-suave" : hecho ? "text-texto md:border-borde md:bg-superficie" : "text-texto-secundario md:border-borde md:bg-superficie"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                esActual ? "border-acento bg-acento text-white" : hecho ? "border-salvia bg-salvia text-white" : "border-borde-fuerte bg-superficie text-texto-secundario"
              }`}
            >
              {hecho ? <Check size={14} strokeWidth={2.5} /> : i + 1}
            </span>
            <span className="min-w-0 md:truncate">
              {paso.nombre}
              {hecho && <span className="sr-only"> (completado)</span>}
              {esActual && <span className="sr-only"> (paso actual)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
