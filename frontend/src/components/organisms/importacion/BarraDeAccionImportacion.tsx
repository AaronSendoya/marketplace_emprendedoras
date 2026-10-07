import { clasesBoton } from "@/components/atoms/Button";

interface PropsBarra {
  cantidad: number;
  // Por qué el botón está desactivado, en palabras; `null` si no lo está.
  motivo: string | null;
  onImportar: () => void;
}

// La barra fija abajo del paso 2: dice cuántas filas se van a importar y, si el botón está desactivado, por qué. Es lo único del
// Admin con una sombra (regla 13, punto i): flota sobre la tabla y sin ella se confundiría con la última fila.
export function BarraDeAccionImportacion({ cantidad, motivo, onImportar }: PropsBarra) {
  const titulo =
    cantidad === 0
      ? "Ninguna emprendedora elegida"
      : `${cantidad} ${cantidad === 1 ? "emprendedora lista" : "emprendedoras listas"} para importar`;

  return (
    <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-lg border border-borde-fuerte bg-superficie px-4 py-3 shadow-[0_6px_18px_rgb(28_25_23/0.12)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0" aria-live="polite">
        <p className="font-titulo text-base font-bold text-texto">{titulo}</p>
        <p className="font-cuerpo text-xs text-texto-secundario">{motivo ?? "Se crea la cuenta y el perfil de cada una, con la imagen predeterminada."}</p>
      </div>
      <button type="button" onClick={onImportar} disabled={motivo !== null} className={clasesBoton("primario", "min-h-11 w-full sm:w-auto lg:min-h-0")}>
        {cantidad === 1 ? "Importar 1 emprendedora" : `Importar ${cantidad} emprendedoras`}
      </button>
    </div>
  );
}
