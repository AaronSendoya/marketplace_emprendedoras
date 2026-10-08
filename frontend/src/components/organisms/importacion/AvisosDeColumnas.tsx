import { Info, TriangleAlert } from "lucide-react";
import type { DatosDelArchivo } from "./VistaPreviaImportacion";

const ICONO = 16;
const CLASES_AVISO = "flex items-start gap-2 rounded-md border border-aviso-borde bg-aviso-suave px-3 py-2.5 font-cuerpo text-sm text-aviso";
const CLASES_INFO = "flex items-start gap-2 rounded-md bg-fondo px-3 py-2 font-cuerpo text-xs text-texto-secundario";

// Un encabezado ajeno puede ser larguísimo; se muestra recortado y entre comillas angulares.
const entre = (texto: string) => `«${texto.length > 60 ? `${texto.slice(0, 57)}…` : texto}»`;

// A, B y C
const unir = (partes: readonly string[]) => (partes.length <= 1 ? (partes[0] ?? "") : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`);

// «A», «B» y «C»
const enumerar = (textos: readonly string[]) => unir(textos.map(entre));

// Lo que la vista previa dice sobre las columnas del archivo (regla 22, «Tolerancia con el formato»): el archivo se acepta
// aunque le falten columnas o traiga otras, y aquí se dice qué pasó con cada una, con el nombre tal como está en el archivo.
// Sin nada que decir, no dibuja nada.
export function AvisosDeColumnas({ archivo }: { archivo: DatosDelArchivo }) {
  const { obligatoriasAusentes, desconocidas, aproximadas, opcionalesAusentes, hojas, hoja } = archivo;
  const hayAlgo = obligatoriasAusentes.length + desconocidas.length + aproximadas.length + opcionalesAusentes.length > 0 || hojas.length > 1;
  if (!hayAlgo) return null;

  return (
    <ul aria-label="Avisos sobre las columnas del archivo" className="space-y-1.5">
      {obligatoriasAusentes.length > 0 && (
        <li className={CLASES_AVISO}>
          <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">
            No encontramos {obligatoriasAusentes.length === 1 ? "la columna" : "las columnas"} {enumerar(obligatoriasAusentes)}. Se lee el archivo igual, pero
            cada fila queda con error hasta que completes ese dato en la tabla.
          </span>
        </li>
      )}
      {desconocidas.length > 0 && (
        <li className={CLASES_AVISO}>
          <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">
            No reconocimos {desconocidas.length === 1 ? "la columna" : "las columnas"} {enumerar(desconocidas)}: no se {desconocidas.length === 1 ? "usa" : "usan"}. Si
            traía datos que necesitabas, revisa que su encabezado se llame como en la guía.
          </span>
        </li>
      )}
      {aproximadas.length > 0 && (
        <li className={CLASES_INFO}>
          <Info size={ICONO} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">
            Leímos {unir(aproximadas.map(({ encabezado, columna }) => `${entre(encabezado)} como ${entre(columna)}`))}. Si no {aproximadas.length === 1 ? "es esa columna" : "son esas columnas"}, corrige el
            encabezado y vuelve a subir el archivo.
          </span>
        </li>
      )}
      {opcionalesAusentes.length > 0 && (
        <li className={CLASES_INFO}>
          <Info size={ICONO} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">
            El archivo no trae {opcionalesAusentes.length === 1 ? "la columna" : "las columnas"} {enumerar(opcionalesAusentes)}: las filas se importan sin ese dato.
          </span>
        </li>
      )}
      {hojas.length > 1 && (
        <li className={CLASES_INFO}>
          <Info size={ICONO} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">
            Se leyó la hoja «{hoja}» (la que tiene los encabezados). Si necesitabas otra, sube un archivo solo con esa hoja.
          </span>
        </li>
      )}
    </ul>
  );
}
