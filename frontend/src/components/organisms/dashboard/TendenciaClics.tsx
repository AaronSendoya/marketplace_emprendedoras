import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { FilaMapaCalor } from "@/lib/api/tipos";
import { calcularTendencia } from "@/lib/metricas/tendencia";

interface PropsTendenciaClics {
  fila: Pick<FilaMapaCalor, "total" | "total_anterior">;
  // Añade "vs. anterior" visible junto al porcentaje (el podio); en la tabla va solo para lectores de
  // pantalla porque el encabezado de la columna ya lo dice.
  conTexto?: boolean;
  // Delante del porcentaje, cuando conviene aclarar de qué es ("Total ").
  prefijo?: string;
}

// La tendencia de los clics totales de una cuenta frente al período anterior de igual duración. `null`
// (un guion) cuando ese período no tuvo clics: un "+100 %" contra una base de cero no es un dato
// honesto. Se usa en la tabla de calor y en el podio.
export function TendenciaClics({ fila, conTexto = false, prefijo = "" }: PropsTendenciaClics) {
  const tendencia = calcularTendencia(fila.total, fila.total_anterior);
  if (tendencia === null) {
    return (
      <span className="font-cuerpo text-sm text-texto-secundario" title="Sin clics en el período anterior con los que comparar">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Sin clics en el período anterior con los que comparar</span>
      </span>
    );
  }
  const Icono = tendencia > 0 ? TrendingUp : tendencia < 0 ? TrendingDown : Minus;
  return (
    <span className="inline-flex items-center gap-1 font-cuerpo text-sm font-semibold text-texto" title="Frente al período anterior de igual duración">
      <Icono size={conTexto ? 16 : 13} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      <span>
        {prefijo}
        {tendencia > 0 ? "+" : ""}
        {tendencia}%
      </span>
      {conTexto ? (
        <span className="font-normal text-texto-secundario">vs. anterior</span>
      ) : (
        <span className="sr-only"> frente al período anterior</span>
      )}
    </span>
  );
}
