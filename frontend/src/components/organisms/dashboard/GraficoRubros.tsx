"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ItemRubroClic } from "@/lib/api/tipos";
import { COLOR_TINTA } from "@/lib/graficos/colores";

interface PropsGraficoRubros {
  datos: ItemRubroClic[];
}

// La paleta del proyecto no tiene "un color por categoría" (CLAUDE.md sección 6, regla 2: tres
// colores de marca, cada uno con un rol fijo) — una dona con más de tres porciones no es motivo
// para inventar colores nuevos. El rubro líder va en tinta (lo más importante, regla 13: el naranja es
// WhatsApp y no se reparte aquí) y el resto en una rampa de neutros.
const NEUTROS = ["#78716c", "#a8a29e", "#d6d3d1", "#e7e5e4"];

export function GraficoRubros({ datos }: PropsGraficoRubros) {
  const ordenados = [...datos].sort((a, b) => b.total - a.total);
  const total = ordenados.reduce((suma, item) => suma + item.total, 0);
  const colorDe = (indice: number) => (indice === 0 ? COLOR_TINTA : NEUTROS[(indice - 1) % NEUTROS.length]);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-6">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={ordenados} dataKey="total" nameKey="rubro" innerRadius="58%" outerRadius="92%" paddingAngle={2} isAnimationActive={false}>
              {ordenados.map((item, indice) => (
                <Cell key={item.rubro} fill={colorDe(indice)} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 14 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full min-w-0 space-y-2.5 font-cuerpo text-sm">
        {ordenados.map((item, indice) => (
          <li key={item.rubro} className="flex items-center gap-3">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: colorDe(indice) }} />
            <span className="min-w-0 flex-1 leading-snug font-medium text-texto">
              {item.rubro}
            </span>
            <span className="shrink-0 tabular-nums text-texto-secundario">{item.total}</span>
            <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-texto">{total > 0 ? Math.round((item.total / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
