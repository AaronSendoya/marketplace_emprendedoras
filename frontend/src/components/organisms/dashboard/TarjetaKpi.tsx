"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface GraficoKpi {
  serie: number[];
  color: string;
  // null: no hay semana anterior con qué comparar (ej. recién empezó a haber clics). No se
  // inventa un porcentaje cuando no hay una base honesta de comparación.
  tendencia: number | null;
}

// Categoría de cada indicador (sección 6, regla 13): el color dice de qué se trata, no decora.
// Magenta, las entidades (emprendedoras); naranja, WhatsApp; púrpura, Instagram; tinta, los totales.
export type TonoKpi = "magenta" | "whatsapp" | "instagram" | "tinta";

const TONOS: Record<TonoKpi, { raya: string; ficha: string }> = {
  magenta: { raya: "border-t-acento", ficha: "bg-acento-suave text-acento" },
  whatsapp: { raya: "border-t-whatsapp", ficha: "bg-enfasis-suave text-whatsapp-fuerte" },
  instagram: { raya: "border-t-secundario", ficha: "bg-secundario-suave text-secundario" },
  tinta: { raya: "border-t-texto", ficha: "bg-fondo text-texto" },
};

interface PropsTarjetaKpi {
  etiqueta: string;
  valor: string;
  tono: TonoKpi;
  // Ya renderizado (`<Store .../>`), no el componente del ícono: esta tarjeta es Client Component
  // (por el sparkline) y una página Server Component no puede pasarle una referencia de función
  // como prop — React solo serializa el elemento ya armado a través de ese límite. Hereda el color
  // de la ficha (currentColor).
  icono: ReactNode;
  disponible?: boolean;
  grafico?: GraficoKpi;
}

// Un indicador del Dashboard: la cifra es lo dominante de la tarjeta, con la etiqueta y su ícono
// funcional arriba y, solo donde hay tendencia, la comparación con el período anterior y su
// miniatura. Las tarjetas se agrupan en un único panel (ver la página). Sin animación (regla 6). La
// miniatura se oculta si la serie es toda ceros: una línea plana invisible no aporta nada.
export function TarjetaKpi({ etiqueta, valor, tono, icono, disponible = true, grafico }: PropsTarjetaKpi) {
  const conDatos = grafico && grafico.serie.some((punto) => punto > 0);
  const { raya, ficha } = TONOS[tono];

  return (
    <div className={`flex flex-col gap-3 border-t-[3px] bg-superficie p-5 sm:p-6 ${raya}`}>
      {/* En pantallas angostas la tarjeta mide ~160 px: la etiqueta ("Emprendedoras") y el ícono no caben
          en una misma fila sin que el ícono se salga de la celda, así que el ícono va encima (`flex-col-reverse`
          solo invierte lo visual; el orden de lectura sigue siendo etiqueta, ícono). */}
      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between">
        <p className="min-w-0 font-cuerpo text-sm leading-snug font-medium text-texto-secundario">{etiqueta}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${ficha}`}>{icono}</span>
      </div>

      <p className="font-titulo text-kpi font-extrabold tracking-tight text-texto tabular-nums">{valor}</p>

      <div className="flex min-h-9 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        {!disponible ? (
          <p className="font-cuerpo text-sm text-texto-secundario">Próximamente</p>
        ) : (
          grafico &&
          grafico.tendencia !== null && (
            <p className="flex items-center gap-1.5 font-cuerpo text-sm font-semibold text-texto" title="Frente al período anterior de igual duración">
              {grafico.tendencia >= 0 ? (
                <TrendingUp size={16} strokeWidth={2} aria-hidden="true" />
              ) : (
                <TrendingDown size={16} strokeWidth={2} aria-hidden="true" />
              )}
              {grafico.tendencia >= 0 ? "+" : ""}
              {grafico.tendencia}%<span className="font-normal text-texto-secundario">vs. anterior</span>
            </p>
          )
        )}

        {conDatos && (
          <div className="h-9 w-24 shrink-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              {/* `accessibilityLayer={false}`: por defecto Recharts vuelve enfocable el gráfico, y este va dentro de un `aria-hidden` (es decorativo: la cifra y la tendencia ya están en texto). */}
              <AreaChart accessibilityLayer={false} data={grafico.serie.map((punto, indice) => ({ indice, punto }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <Area
                  type="monotone"
                  dataKey="punto"
                  stroke={grafico.color}
                  fill={grafico.color}
                  fillOpacity={0.14}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
