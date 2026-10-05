"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/atoms/Select";
import { TOPE_RANKING_POR_DEFECTO } from "@/lib/metricas/rango";

// Mismas opciones que admite el backend (`EsquemaRankingQuery`, máximo 20).
const OPCIONES = [5, 10, 20];

interface PropsSelectorTopRanking {
  valor: number;
}

// Cuántas emprendedoras trae "Emprendimientos más contactados" (regla 19). Cambiarlo actualiza
// `top` en la URL, mismo patrón que SelectorLimite.
export function SelectorTopRanking({ valor }: PropsSelectorTopRanking) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function cambiar(nuevoTope: string) {
    const parametros = new URLSearchParams(searchParams.toString());
    if (Number(nuevoTope) === TOPE_RANKING_POR_DEFECTO) {
      parametros.delete("top");
    } else {
      parametros.set("top", nuevoTope);
    }
    const query = parametros.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <label className="inline-flex items-center gap-2 font-cuerpo text-sm font-medium text-texto-secundario">
      Top
      <Select value={String(valor)} onChange={(evento) => cambiar(evento.target.value)} aria-label="Cuántas emprendedoras mostrar" className="w-auto min-h-11 lg:min-h-0">
        {OPCIONES.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
      </Select>
    </label>
  );
}
