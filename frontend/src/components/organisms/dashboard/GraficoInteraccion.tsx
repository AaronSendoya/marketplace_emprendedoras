"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ItemSerieClic } from "@/lib/api/tipos";
import { COLOR_BORDE, COLOR_ENFASIS, COLOR_SECUNDARIO, COLOR_TEXTO_SECUNDARIO } from "@/lib/graficos/colores";

interface PropsGraficoInteraccion {
  serie: ItemSerieClic[];
  // La serie del período inmediatamente anterior, de igual duración. `null` cuando ese período no
  // tuvo ningún clic: no se dibuja una línea plana sobre cero ni se compara contra una base vacía.
  serieAnterior: ItemSerieClic[] | null;
}

// Un punto del gráfico: el día del período elegido y, alineado por posición, el día equivalente del
// período anterior (el día N de uno con el día N del otro, porque ambos duran lo mismo).
interface PuntoInteraccion extends ItemSerieClic {
  fechaAnterior?: string;
  whatsappAnterior?: number;
  instagramAnterior?: number;
}

function fechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

function fechaCompleta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

const ESTILO_EJE = { fontSize: 13, fill: COLOR_TEXTO_SECUNDARIO };

// La línea del período anterior: punteada, sin relleno y más tenue que la del período elegido, para que
// se lea como referencia y no compita con los datos de hoy.
const ESTILO_ANTERIOR = { fill: "none", strokeDasharray: "6 4", strokeWidth: 2, strokeOpacity: 0.55 } as const;

// Un círculo propio y no el punto de Recharts: ese hereda el relleno y el trazo punteado del área y sale
// hueco o entrecortado. Sólido el del período elegido; hueco y de trazo continuo el del anterior.
function puntoDelDia(color: string, anterior: boolean) {
  return function Punto({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) {
    return (
      <circle key={index} cx={cx} cy={cy} r={anterior ? 4 : 5} fill={anterior ? "#fff" : color} stroke={color} strokeWidth={2} strokeDasharray="none" />
    );
  };
}

interface PropsTooltip {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  conAnterior: boolean;
}

// El tooltip se arma a mano (no el de Recharts por defecto) para decir, por canal, el valor del día y el
// del día equivalente del período anterior con su fecha. Sin sombra (regla 13).
function TooltipInteraccion({ active, payload, conAnterior }: PropsTooltip) {
  const punto = payload?.[0]?.payload as PuntoInteraccion | undefined;
  if (!active || !punto) return null;

  const filas = [
    { clave: "whatsapp", nombre: "WhatsApp", color: COLOR_ENFASIS, valor: punto.whatsapp, anterior: punto.whatsappAnterior },
    { clave: "instagram", nombre: "Instagram", color: COLOR_SECUNDARIO, valor: punto.instagram, anterior: punto.instagramAnterior },
  ];

  return (
    <div className="rounded-md border border-borde bg-superficie px-3.5 py-3 font-cuerpo text-sm text-texto">
      <p className="font-semibold">{fechaCompleta(punto.fecha)}</p>
      <ul className="mt-2 space-y-1.5">
        {filas.map(({ clave, nombre, color, valor, anterior }) => (
          <li key={clave} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {nombre}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-semibold tabular-nums">{valor}</span>
              {conAnterior && anterior !== undefined && <span className="text-texto-secundario tabular-nums">antes {anterior}</span>}
            </span>
          </li>
        ))}
      </ul>
      {conAnterior && punto.fechaAnterior && (
        <p className="mt-2 border-t border-borde pt-2 text-texto-secundario">Antes: {fechaCompleta(punto.fechaAnterior)}</p>
      )}
    </div>
  );
}

// Naranja para WhatsApp (su color fijo en todo el sitio, CLAUDE.md sección 6 regla 2) y púrpura
// para Instagram (el otro color de marca que no es ni navegación ni CTA). Sin animación (regla 6). La
// leyenda no vive aquí sino en el encabezado de la tarjeta (ver la página), junto al título. El eje
// vertical deja sitio a sus etiquetas (ancho propio y sin margen negativo): ninguna queda cortada
// (regla 13). Más alto en escritorio que en móvil, donde ocupa el ancho de la pantalla. El eje se
// ajusta solo a la línea más alta, sea la del período elegido o la del anterior.
export function GraficoInteraccion({ serie, serieAnterior }: PropsGraficoInteraccion) {
  const conAnterior = serieAnterior !== null;
  // Con un solo día ("Hoy") una línea no tiene por dónde correr: se dibujan puntos. Los del período
  // anterior van huecos para distinguirlos de los del período elegido.
  const unSoloDia = serie.length === 1;
  const datos: PuntoInteraccion[] = serie.map((punto, indice) => {
    const previo = serieAnterior?.[indice];
    return previo
      ? { ...punto, fechaAnterior: previo.fecha, whatsappAnterior: previo.whatsapp, instagramAnterior: previo.instagram }
      : punto;
  });

  return (
    <div className="h-64 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={COLOR_BORDE} strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="fecha"
            tickFormatter={fechaCorta}
            tick={ESTILO_EJE}
            axisLine={{ stroke: COLOR_BORDE }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={32}
            tickMargin={10}
          />
          <YAxis allowDecimals={false} tick={ESTILO_EJE} axisLine={false} tickLine={false} width={36} tickMargin={8} />
          <Tooltip content={(props) => <TooltipInteraccion {...props} conAnterior={conAnterior} />} cursor={{ stroke: COLOR_BORDE }} />
          {conAnterior && (
            <>
              <Area
                type="monotone"
                dataKey="whatsappAnterior"
                name="whatsappAnterior"
                stroke={COLOR_ENFASIS}
                {...ESTILO_ANTERIOR}
                dot={unSoloDia ? puntoDelDia(COLOR_ENFASIS, true) : false}
                activeDot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="instagramAnterior"
                name="instagramAnterior"
                stroke={COLOR_SECUNDARIO}
                {...ESTILO_ANTERIOR}
                dot={unSoloDia ? puntoDelDia(COLOR_SECUNDARIO, true) : false}
                activeDot={false}
                isAnimationActive={false}
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="whatsapp"
            name="whatsapp"
            stroke={COLOR_ENFASIS}
            fill={COLOR_ENFASIS}
            fillOpacity={0.1}
            strokeWidth={2.5}
            dot={unSoloDia ? puntoDelDia(COLOR_ENFASIS, false) : false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="instagram"
            name="instagram"
            stroke={COLOR_SECUNDARIO}
            fill={COLOR_SECUNDARIO}
            fillOpacity={0.08}
            strokeWidth={2.5}
            dot={unSoloDia ? puntoDelDia(COLOR_SECUNDARIO, false) : false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
