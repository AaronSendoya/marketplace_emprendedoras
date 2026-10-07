import type { FilaMapaCalor, OrdenMapaCalor } from "@/lib/api/tipos";
import { formatearPorcentaje } from "@/lib/formato/precio";
import { ETIQUETA_ORDEN, formatearEntero } from "@/lib/metricas/mapaCalor";

interface PropsConcentracionClics {
  // Las filas del orden elegido, de la primera en adelante.
  filas: FilaMapaCalor[];
  orden: OrdenMapaCalor;
  // Los clics de todas las cuentas en el período, del mismo tipo que `orden` (totales, de WhatsApp o de
  // Instagram): la base de la participación.
  totalDelOrden: number;
}

// Cada tramo de la barra con su leyenda. Los tonos son neutros a propósito (tinta, gris, gris claro y el
// resto): la concentración no es un canal ni una categoría, así que no usa un color de marca (regla 13).
const TRAMOS = [
  { nombre: "Primera", clase: "bg-texto" },
  { nombre: "Segunda", clase: "bg-texto-secundario" },
  { nombre: "Tercera", clase: "bg-borde-fuerte" },
  { nombre: "El resto", clase: "bg-borde" },
];

function textoPorcentaje(valor: number): string {
  return formatearPorcentaje(Math.round(valor * 10) / 10);
}

// Qué parte de los clics del período reúnen las tres primeras. Dice el dato y nada más: sin una
// etiqueta de "alta" o "baja", porque no hay un criterio de negocio que la defina. Con tres filas o menos
// sería siempre el 100 %, así que en ese caso no se muestra.
export function ConcentracionClics({ filas, orden, totalDelOrden }: PropsConcentracionClics) {
  if (filas.length <= 3 || totalDelOrden <= 0) return null;

  const partes = filas.slice(0, 3).map((fila) => ((orden === "total" ? fila.total : fila[orden]) / totalDelOrden) * 100);
  const reunen = partes.reduce((suma, parte) => suma + parte, 0);
  const todas = [...partes, Math.max(0, 100 - reunen)];

  return (
    <div className="space-y-4 border-t border-borde px-5 py-5 sm:px-6">
      <div>
        <p className="font-cuerpo text-base text-texto">
          Las 3 primeras reúnen el <strong className="font-titulo text-xl font-extrabold tabular-nums">{textoPorcentaje(reunen)}</strong> de los{" "}
          {formatearEntero(totalDelOrden)} {ETIQUETA_ORDEN[orden]} del período.
        </p>
        <p className="mt-1 font-cuerpo text-sm text-texto-secundario">El resto de los clics se reparte entre las demás emprendedoras.</p>
      </div>
      <div role="img" aria-label="Reparto de los clics entre las tres primeras y el resto" className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-fondo">
        {todas.map((parte, indice) => (
          <div key={TRAMOS[indice].nombre} className={TRAMOS[indice].clase} style={{ flex: `${parte} 1 0%` }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 font-cuerpo text-sm text-texto-secundario">
        {todas.map((parte, indice) => (
          <li key={TRAMOS[indice].nombre} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className={`h-3 w-3 rounded-sm border border-borde-fuerte ${TRAMOS[indice].clase}`} />
            {TRAMOS[indice].nombre} <strong className="font-semibold text-texto tabular-nums">{textoPorcentaje(parte)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
