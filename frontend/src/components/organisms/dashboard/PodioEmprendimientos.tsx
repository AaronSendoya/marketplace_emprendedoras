import { Avatar } from "@/components/atoms/Avatar";
import type { FilaMapaCalor, OrdenMapaCalor } from "@/lib/api/tipos";
import type { IdentidadPerfil } from "@/lib/metricas/identidad";
import { ETIQUETA_ORDEN, formatearEntero, serieDeFila } from "@/lib/metricas/mapaCalor";
import { EvolucionMini } from "./EvolucionMini";
import { EnlaceNegocio, RubroCiudad } from "./IdentidadEmprendimiento";
import { TendenciaClics } from "./TendenciaClics";

interface PropsPodioEmprendimientos {
  // Las tres primeras filas del orden elegido (menos si hay menos cuentas con clics).
  filas: FilaMapaCalor[];
  identidades: Record<string, IdentidadPerfil>;
  orden: OrdenMapaCalor;
  // "día", "semana" o "mes": la unidad de la miniatura de evolución, para su texto accesible.
  unidad: string;
}

// El puesto se dice con el borde superior de la tarjeta: tinta para la primera y más tenue después.
// Cadenas literales completas para que Tailwind las encuentre.
const BORDE_POR_PUESTO = ["border-t-texto", "border-t-texto-secundario", "border-t-borde-fuerte"];
const COLUMNAS: Record<number, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 3: "md:grid-cols-3" };

function metrica(fila: FilaMapaCalor, orden: OrdenMapaCalor): number {
  return orden === "total" ? fila.total : fila[orden];
}

// Las tres emprendedoras con más clics del orden elegido, para ver quiénes son (emprendedora, rubro,
// ciudad) y no solo cuántos clics tienen. La cifra grande es la métrica por la que se ordena, así que
// el podio nunca contradice a la tabla de abajo. Va en un panel con divisiones de 1 px entre tarjetas,
// como los indicadores de arriba (regla 13). Desde `md` las tres tarjetas comparten filas (subcuadrícula)
// y su cifra y sus barras quedan alineadas aunque un nombre ocupe dos líneas; debajo de `md` se apilan y
// la miniatura de evolución, que ya está en la tabla, se omite.
export function PodioEmprendimientos({ filas, identidades, orden, unidad }: PropsPodioEmprendimientos) {
  if (filas.length === 0) return null;
  const columnas = COLUMNAS[Math.min(filas.length, 3)];

  return (
    <ol className={`grid gap-px bg-borde md:grid-rows-[repeat(4,auto)] ${columnas}`} aria-label="Las emprendedoras con más clics">
      {filas.slice(0, 3).map((fila, indice) => {
        const identidad = identidades[fila.perfil_id];
        const canales = fila.whatsapp + fila.instagram;
        return (
          <li
            key={fila.perfil_id}
            className={`grid min-w-0 gap-4 border-t-[3px] bg-superficie p-5 sm:p-6 md:row-span-4 md:grid-rows-subgrid ${BORDE_POR_PUESTO[indice]}`}
          >
            <div className="flex items-start gap-4">
              <span className="relative shrink-0">
                <Avatar nombreCompleto={fila.nombre_negocio} tamano="lg" />
                <span
                  aria-label={`Puesto ${indice + 1}`}
                  className="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-superficie bg-texto font-cuerpo text-xs font-bold text-white"
                >
                  {indice + 1}
                </span>
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="font-titulo text-lg leading-tight font-bold text-texto">
                  <EnlaceNegocio perfilId={fila.perfil_id} nombre={fila.nombre_negocio} />
                </p>
                {identidad && <p className="font-cuerpo text-sm text-texto-secundario">{identidad.emprendedora}</p>}
                {identidad && (
                  <p className="font-cuerpo text-sm text-texto-secundario">
                    <RubroCiudad identidad={identidad} />
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="font-titulo text-4xl leading-none font-extrabold tracking-tight text-texto tabular-nums">
                {formatearEntero(metrica(fila, orden))}
                <span className="ml-1.5 font-cuerpo text-sm font-medium tracking-normal text-texto-secundario">{ETIQUETA_ORDEN[orden]}</span>
              </p>
              <TendenciaClics fila={fila} conTexto prefijo={orden === "total" ? "" : "Total "} />
            </div>

            <div className="space-y-2">
              <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-fondo">
                {fila.whatsapp > 0 && <div className="bg-whatsapp" style={{ flex: `${fila.whatsapp} 1 0%` }} />}
                {fila.instagram > 0 && <div className="bg-secundario" style={{ flex: `${fila.instagram} 1 0%` }} />}
              </div>
              <p className="flex flex-wrap gap-x-4 gap-y-1 font-cuerpo text-sm text-texto-secundario">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-whatsapp" />
                  WhatsApp <strong className="font-semibold text-texto tabular-nums">{formatearEntero(fila.whatsapp)}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-secundario" />
                  Instagram <strong className="font-semibold text-texto tabular-nums">{formatearEntero(fila.instagram)}</strong>
                </span>
                {canales === 0 && <span className="sr-only">Sin clics</span>}
              </p>
            </div>

            <div className="hidden space-y-1 md:block">
              <p className="font-cuerpo text-sm text-texto-secundario">Evolución del período</p>
              <EvolucionMini
                serie={serieDeFila(fila.celdas)}
                etiqueta={`Evolución de ${fila.nombre_negocio} en el período, por ${unidad}.`}
                className="h-11 w-full"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
