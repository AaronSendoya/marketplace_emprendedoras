"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

interface Preset {
  id: string;
  etiqueta: string;
  calcular: (hoy: string) => { desde: string; hasta: string };
}

// "30d" es el valor por defecto del backend sin `desde`/`hasta` (regla 19): se guarda así en vez de
// escribir las fechas en la URL, para que el filtro por defecto se vea igual de "limpio" que el
// resto de los filtros del panel (ej. AdminToolbar sin `q` ni `estado`).
const PRESETS: Preset[] = [
  { id: "hoy", etiqueta: "Hoy", calcular: (hoy) => ({ desde: hoy, hasta: hoy }) },
  { id: "7d", etiqueta: "7 días", calcular: (hoy) => ({ desde: sumarDias(hoy, -6), hasta: hoy }) },
  { id: "30d", etiqueta: "30 días", calcular: (hoy) => ({ desde: sumarDias(hoy, -29), hasta: hoy }) },
  { id: "12m", etiqueta: "12 meses", calcular: (hoy) => ({ desde: sumarDias(hoy, -365), hasta: hoy }) },
];

interface PropsSelectorPeriodo {
  // El día de hoy (YYYY-MM-DD, La Paz), calculado una sola vez por la página: si este componente lo
  // calculara al renderizar, el servidor y el navegador podrían tener un "hoy" distinto y el HTML
  // no coincidiría al hidratar (el atajo activo cambiaría de uno a "Personalizado").
  hoy: string;
  // El período que se está viendo, ya escrito ("6 sep – 5 oct 2026"), para que quede junto al control.
  etiquetaRango: string;
}

// Filtro de período de todo el Dashboard (regla 19): cambiarlo actualiza `desde`/`hasta` en la URL,
// mismo patrón que AdminToolbar/SelectorLimite, así que el Server Component de la página vuelve a
// pedir resumen, ranking, serie y distribución por rubro con el rango elegido. Los atajos se
// calculan con la fecha del navegador; quien valida e interpreta el rango como días de La Paz es
// siempre el backend (regla 19), esto solo decide qué `desde`/`hasta` mandar.
export function SelectorPeriodo({ hoy, etiquetaRango }: PropsSelectorPeriodo) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;

  const presetActivo =
    !desde && !hasta
      ? "30d"
      : PRESETS.find((preset) => {
          const calculado = preset.calcular(hoy);
          return calculado.desde === desde && calculado.hasta === hasta;
        })?.id;

  const [personalizarAbierto, setPersonalizarAbierto] = useState(!presetActivo);
  const [desdeInput, setDesdeInput] = useState(desde ?? "");
  const [hastaInput, setHastaInput] = useState(hasta ?? hoy);

  // Si el rango de la URL cambia desde afuera (atrás/adelante del navegador, un enlace externo), el
  // formulario personalizado se sincroniza durante el render (patrón "adjusting state when a prop
  // changes" de React) en vez de un useEffect: evita un primer pintado con los valores viejos.
  const [rangoSincronizado, setRangoSincronizado] = useState({ desde, hasta });
  if (rangoSincronizado.desde !== desde || rangoSincronizado.hasta !== hasta) {
    setRangoSincronizado({ desde, hasta });
    setPersonalizarAbierto(!presetActivo);
    setDesdeInput(desde ?? "");
    setHastaInput(hasta ?? hoy);
  }

  function navegar(nuevoDesde: string | undefined, nuevoHasta: string | undefined) {
    const parametros = new URLSearchParams(searchParams.toString());
    if (nuevoDesde && nuevoHasta) {
      parametros.set("desde", nuevoDesde);
      parametros.set("hasta", nuevoHasta);
    } else {
      parametros.delete("desde");
      parametros.delete("hasta");
    }
    const query = parametros.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function elegirPreset(preset: Preset) {
    setPersonalizarAbierto(false);
    if (preset.id === "30d") {
      navegar(undefined, undefined);
      return;
    }
    const calculado = preset.calcular(hoy);
    navegar(calculado.desde, calculado.hasta);
  }

  const rangoInvalido = Boolean(desdeInput) && Boolean(hastaInput) && hastaInput < desdeInput;

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:items-end">
      <p className="font-cuerpo text-xs font-medium text-texto-secundario">Período: {etiquetaRango}</p>

      {/* Un solo control, no una fila de botones sueltos: el segmento activo en púrpura (el estado
          seleccionado, regla 2). Si no caben en una línea, bajan a una segunda dentro del mismo control. */}
      <div role="group" aria-label="Filtrar el Dashboard por período" className="inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border border-borde-fuerte bg-superficie p-1">
        {PRESETS.map((preset) => (
          <Segmento key={preset.id} etiqueta={preset.etiqueta} seleccionado={presetActivo === preset.id} onClick={() => elegirPreset(preset)} />
        ))}
        <Segmento etiqueta="Personalizado" seleccionado={!presetActivo} onClick={() => setPersonalizarAbierto(true)} />
      </div>

      {personalizarAbierto && (
        <div className="flex flex-wrap items-end gap-3 sm:justify-end">
          <div className="space-y-1">
            <label htmlFor="periodo-desde" className="block font-cuerpo text-sm font-medium text-texto-secundario">
              Desde
            </label>
            <Input
              id="periodo-desde"
              type="date"
              value={desdeInput}
              max={hastaInput || undefined}
              onChange={(evento) => setDesdeInput(evento.target.value)}
              className="w-auto"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="periodo-hasta" className="block font-cuerpo text-sm font-medium text-texto-secundario">
              Hasta
            </label>
            <Input
              id="periodo-hasta"
              type="date"
              value={hastaInput}
              min={desdeInput || undefined}
              max={hoy}
              onChange={(evento) => setHastaInput(evento.target.value)}
              className="w-auto"
            />
          </div>
          <Button variante="secundario" disabled={!desdeInput || !hastaInput || rangoInvalido} onClick={() => navegar(desdeInput, hastaInput)}>
            Aplicar
          </Button>
          {rangoInvalido && <p className="w-full font-cuerpo text-sm text-texto-secundario sm:text-right">“Hasta” debe ser igual o posterior a “desde”.</p>}
        </div>
      )}
    </div>
  );
}

interface PropsSegmento {
  etiqueta: string;
  seleccionado: boolean;
  onClick: () => void;
}

function Segmento({ etiqueta, seleccionado, onClick }: PropsSegmento) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionado}
      className={`inline-flex min-h-11 items-center rounded-md px-4 font-cuerpo text-sm transition-colors lg:min-h-10 ${
        seleccionado ? "bg-secundario font-semibold text-white" : "font-medium text-texto-secundario hover:bg-fondo hover:text-texto"
      } ${CLASES_FOCO_ENLACE}`}
    >
      {etiqueta}
    </button>
  );
}
