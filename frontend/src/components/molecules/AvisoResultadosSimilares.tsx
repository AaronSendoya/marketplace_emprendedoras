import { SpellCheck } from "lucide-react";

interface PropsAvisoResultadosSimilares {
  // El texto que se buscó, tal como lo escribió quien busca.
  busqueda: string;
}

// Se muestra encima de la rejilla cuando la búsqueda no tuvo ninguna coincidencia exacta y lo que se ve son perfiles
// parecidos (CLAUDE.md sección 5, búsqueda en vivo, y regla 20 del contrato compartido). Es un aviso y no una alerta:
// nada falló, solo se explica por qué estas tarjetas no dicen lo mismo que el texto escrito. Sin `role`: el contador de
// la barra de filtros ya anuncia el cambio (`aria-live`) y repetirlo en dos sitios sería ruido. Las tarjetas que
// explica llevan la misma línea naranja (`EmprendedoraCard`, `similar`).
export function AvisoResultadosSimilares({ busqueda }: PropsAvisoResultadosSimilares) {
  return (
    <div className="flex items-start gap-3 rounded-superficie border border-marca/30 bg-marca/10 px-4 py-3">
      <SpellCheck size={20} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-enfasis" />
      <p className="min-w-0 font-cuerpo text-sm leading-relaxed text-texto">
        No hay resultados exactos para <strong className="font-semibold break-words">«{busqueda}»</strong>. Te mostramos los más parecidos.
      </p>
    </div>
  );
}
