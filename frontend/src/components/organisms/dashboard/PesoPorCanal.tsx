import { BarChart3, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import type { ResumenClics } from "@/lib/api/tipos";
import { COLOR_ENFASIS, COLOR_SECUNDARIO } from "@/lib/graficos/colores";
import { formatearPorcentaje } from "@/lib/formato/precio";
import { cambioEnPuntos, formatearPuntos, participacionPorCanal } from "@/lib/metricas/canales";

interface PropsPesoPorCanal {
  actual: ResumenClics;
  anterior: ResumenClics;
  // El período anterior en texto corto ("7 ago – 5 sep 2026"), para que se sepa contra qué se compara.
  etiquetaAnterior: string;
}

function textoClics(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "clic" : "clics"}`;
}

// Un decimal como máximo: 66,7 % y 33,3 %, no 66,666...
function textoParticipacion(porcentaje: number | null): string {
  return porcentaje === null ? "—" : formatearPorcentaje(Math.round(porcentaje * 10) / 10);
}

interface PropsBarra {
  whatsapp: number;
  instagram: number;
  // La barra del período anterior es más fina y más tenue: es la referencia, no el dato de hoy.
  referencia?: boolean;
}

// Una barra al 100 %: cada canal ocupa lo que pesó en los clics. Es decorativa (`aria-hidden`): los
// números están en el texto de al lado. Un canal sin clics no deja un tramo vacío.
function Barra({ whatsapp, instagram, referencia = false }: PropsBarra) {
  return (
    <div aria-hidden="true" className={`flex gap-0.5 overflow-hidden rounded-full bg-fondo ${referencia ? "h-2.5 opacity-50" : "h-4"}`}>
      {whatsapp > 0 && <div style={{ flex: `${whatsapp} 1 0%`, backgroundColor: COLOR_ENFASIS }} />}
      {instagram > 0 && <div style={{ flex: `${instagram} 1 0%`, backgroundColor: COLOR_SECUNDARIO }} />}
    </div>
  );
}

// `null` solo ocurre cuando el período anterior no tuvo clics, y eso ya lo dice la nota junto a su barra:
// repetir "Sin comparación" en cada canal sería ruido.
function CambioEnPuntos({ cambio }: { cambio: number | null }) {
  if (cambio === null) return null;
  if (cambio === 0) {
    return (
      <span className="flex items-center gap-1.5 font-semibold text-texto">
        <Minus size={16} strokeWidth={2} aria-hidden="true" />
        Sin cambio<span className="font-normal text-texto-secundario">vs. anterior</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 font-semibold text-texto" title="Frente al período anterior de igual duración">
      {cambio > 0 ? <TrendingUp size={16} strokeWidth={2} aria-hidden="true" /> : <TrendingDown size={16} strokeWidth={2} aria-hidden="true" />}
      {cambio > 0 ? "+" : ""}
      {formatearPuntos(cambio)} pp<span className="font-normal text-texto-secundario">vs. anterior</span>
    </span>
  );
}

interface PropsFilaCanal {
  nombre: string;
  color: string;
  clics: number;
  porcentaje: number | null;
  cambio: number | null;
}

function FilaCanal({ nombre, color, clics, porcentaje, cambio }: PropsFilaCanal) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2.5 font-cuerpo text-base font-semibold text-texto">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          {nombre}
        </p>
        <p className="font-titulo text-3xl font-extrabold tracking-tight text-texto tabular-nums">{textoParticipacion(porcentaje)}</p>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-cuerpo text-sm text-texto-secundario">
        <span>{textoClics(clics)}</span>
        <CambioEnPuntos cambio={cambio} />
      </div>
    </li>
  );
}

// Por qué canal contactan y cómo cambió frente al período anterior de igual duración (regla 19, y la
// sección 5 del CLAUDE.md). Todo sale de los resúmenes que ya trae el Dashboard: sin pedir nada nuevo.
// Sin clics en el período no hay participación que mostrar; sin clics en el anterior se muestra solo el
// actual y se dice por qué no hay comparación (no se compara contra una base vacía).
export function PesoPorCanal({ actual, anterior, etiquetaAnterior }: PropsPesoPorCanal) {
  const ahora = participacionPorCanal(actual);
  const antes = participacionPorCanal(anterior);

  if (ahora.total === 0) {
    return <EstadoVacio icono={BarChart3} titulo="Todavía no hay datos" descripcion="Se mostrará acá en cuanto haya clics a WhatsApp o Instagram en el período." />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="space-y-6">
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-4 font-cuerpo text-sm">
            <p className="font-semibold text-texto">Este período</p>
            <p className="text-texto-secundario tabular-nums">{textoClics(ahora.total)}</p>
          </div>
          <Barra whatsapp={actual.whatsapp} instagram={actual.instagram} />
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-cuerpo text-sm">
            <p className="font-medium text-texto-secundario">
              Período anterior<span className="font-normal"> · {etiquetaAnterior}</span>
            </p>
            {antes.total > 0 && <p className="text-texto-secundario tabular-nums">{textoClics(antes.total)}</p>}
          </div>
          {antes.total > 0 ? (
            <Barra whatsapp={anterior.whatsapp} instagram={anterior.instagram} referencia />
          ) : (
            <p className="font-cuerpo text-sm text-texto-secundario">Sin clics en ese período: no hay con qué comparar.</p>
          )}
        </div>
      </div>

      <ul className="divide-y divide-borde">
        <FilaCanal
          nombre="WhatsApp"
          color={COLOR_ENFASIS}
          clics={actual.whatsapp}
          porcentaje={ahora.whatsapp}
          cambio={cambioEnPuntos(ahora.whatsapp, antes.whatsapp)}
        />
        <FilaCanal
          nombre="Instagram"
          color={COLOR_SECUNDARIO}
          clics={actual.instagram}
          porcentaje={ahora.instagram}
          cambio={cambioEnPuntos(ahora.instagram, antes.instagram)}
        />
      </ul>
    </div>
  );
}
