"use client";

import { ChevronDown, ChevronsUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/atoms/Avatar";
import type { MapaCalorClics, OrdenMapaCalor } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { formatearPorcentaje } from "@/lib/formato/precio";
import {
  calcularCuota,
  ETIQUETA_NIVEL,
  formatearEntero,
  nivelCalor,
  ORDEN_MAPA_CALOR_POR_DEFECTO,
  serieDeFila,
  UMBRAL_ALTO,
  UMBRAL_MEDIO,
  UMBRAL_MUY_ALTO,
  UNIDAD_POR_GRANULARIDAD,
  type NivelCalor,
} from "@/lib/metricas/mapaCalor";
import type { IdentidadPerfil } from "@/lib/metricas/identidad";
import { EvolucionMini } from "./EvolucionMini";
import { EnlaceNegocio, RubroCiudad } from "./IdentidadEmprendimiento";
import { TendenciaClics } from "./TendenciaClics";

interface PropsTablaCalorPerfiles {
  mapa: MapaCalorClics;
  orden: OrdenMapaCalor;
  // Clics de todas las cuentas en el período (WhatsApp + Instagram): la base del "% del total".
  totalPeriodo: number;
  // Quién es cada emprendimiento (emprendedora, rubro y ciudad), por `perfil_id`. Vacío si la lista pública
  // de perfiles no respondió: la fila se muestra igual, solo con el nombre del negocio.
  identidades: Record<string, IdentidadPerfil>;
}

type Columna = "whatsapp" | "instagram" | "total";

// Cada columna tiene su tono (naranja WhatsApp y púrpura Instagram, los colores que ya tienen sus
// canales en todo el sitio; tinta para el total) y cuatro intensidades. Los fondos claros llevan
// texto oscuro y los más fuertes texto blanco, siempre con contraste suficiente: el naranja más
// fuerte es `whatsapp-fuerte` (#c2410c, 5,2:1 con blanco) y no `whatsapp`, que con blanco no llega a
// 4,5:1. Los tokens de canal no dependen del color del botón, que el tema del Admin oscurece
// (regla 13). Son cadenas literales completas para que Tailwind las encuentre.
const SIN_CLICS = "bg-borde/40 text-texto-secundario";
const ESTILOS: Record<Columna, Record<NivelCalor, string>> = {
  whatsapp: {
    0: SIN_CLICS,
    1: "bg-whatsapp/10 text-texto-secundario",
    2: "bg-whatsapp/25 text-texto",
    3: "bg-whatsapp/55 text-texto",
    4: "bg-whatsapp-fuerte text-white",
  },
  instagram: {
    0: SIN_CLICS,
    1: "bg-secundario/10 text-texto-secundario",
    2: "bg-secundario/25 text-texto",
    3: "bg-secundario/55 text-texto",
    4: "bg-secundario text-white",
  },
  total: {
    0: SIN_CLICS,
    1: "bg-texto/10 text-texto-secundario",
    2: "bg-texto/20 text-texto",
    3: "bg-texto/40 text-texto",
    4: "bg-texto text-white",
  },
};

const NIVELES_DE_LEYENDA: NivelCalor[] = [4, 3, 2, 1, 0];
// Lo que significa cada nivel frente al líder de la columna (los mismos umbrales que nivelCalor).
const UMBRAL_DE_LEYENDA: Record<NivelCalor, string> = {
  4: `≥ ${UMBRAL_MUY_ALTO * 100} %`,
  3: `≥ ${UMBRAL_ALTO * 100} %`,
  2: `≥ ${UMBRAL_MEDIO * 100} %`,
  1: `< ${UMBRAL_MEDIO * 100} %`,
  0: "",
};

function Celda({ valor, nivel, columna }: { valor: number; nivel: NivelCalor; columna: Columna }) {
  return (
    <div
      title={ETIQUETA_NIVEL[nivel]}
      className={`mx-auto flex h-10 min-w-10 items-center justify-center rounded-md px-1 font-cuerpo text-base font-bold tabular-nums sm:min-w-14 ${ESTILOS[columna][nivel]}`}
    >
      {formatearEntero(valor)}
    </div>
  );
}

interface PropsEncabezadoOrdenable {
  etiquetaLarga: string;
  etiquetaCorta: string;
  valor: OrdenMapaCalor;
  actual: OrdenMapaCalor;
  alOrdenar: (orden: OrdenMapaCalor) => void;
}

// Cambiar el orden vuelve a pedir el top al servidor (no solo reordena las filas ya mostradas): el
// Top 10 por WhatsApp son las 10 cuentas con más clics de WhatsApp.
function EncabezadoOrdenable({ etiquetaLarga, etiquetaCorta, valor, actual, alOrdenar }: PropsEncabezadoOrdenable) {
  const activo = valor === actual;
  return (
    <th scope="col" aria-sort={activo ? "descending" : "none"} className="sticky top-0 z-10 bg-superficie px-0.5 py-1 text-center">
      <button
        type="button"
        onClick={() => alOrdenar(valor)}
        aria-label={`Ordenar por ${etiquetaLarga}`}
        className={`inline-flex min-h-11 items-center gap-0.5 rounded-md px-1 font-cuerpo text-xs font-semibold transition-colors lg:min-h-0 lg:py-1 ${CLASES_FOCO_ENLACE} ${
          activo ? "text-texto" : "text-texto-secundario hover:text-texto"
        }`}
      >
        <span aria-hidden="true" className="sm:hidden">
          {etiquetaCorta}
        </span>
        <span aria-hidden="true" className="hidden sm:inline">
          {etiquetaLarga}
        </span>
        {activo ? (
          <ChevronDown size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />
        ) : (
          <ChevronsUpDown size={13} strokeWidth={1.75} aria-hidden="true" className="shrink-0 opacity-40" />
        )}
      </button>
    </th>
  );
}

const ENCABEZADO_FIJO = "sticky top-0 z-10 bg-superficie px-1 py-2 font-cuerpo text-xs font-semibold text-texto-secundario";

// Tabla de calor de las emprendedoras más populares (regla 19): una fila por cuenta con sus clics de
// WhatsApp, Instagram y el total en celdas con el número dentro, su evolución en el período y su
// tendencia contra el período anterior. El color de cada celda dice cuánto representa frente al
// líder de su columna, con niveles con nombre que la leyenda explica; el número siempre está a la
// vista, así que nada depende solo del color. Los encabezados de canal ordenan (y eligen el top).
export function TablaCalorPerfiles({ mapa, orden, totalPeriodo, identidades }: PropsTablaCalorPerfiles) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendiente, iniciarTransicion] = useTransition();

  const { filas, granularidad } = mapa;
  if (filas.length === 0) return null;

  // El líder de cada columna: contra él se mide el nivel de calor.
  const lideres: Record<Columna, number> = {
    whatsapp: Math.max(...filas.map((fila) => fila.whatsapp)),
    instagram: Math.max(...filas.map((fila) => fila.instagram)),
    total: Math.max(...filas.map((fila) => fila.total)),
  };

  function ordenar(nuevo: OrdenMapaCalor) {
    if (nuevo === orden) return;
    const parametros = new URLSearchParams(searchParams.toString());
    if (nuevo === ORDEN_MAPA_CALOR_POR_DEFECTO) {
      parametros.delete("orden");
    } else {
      parametros.set("orden", nuevo);
    }
    const consulta = parametros.toString();
    // Sin volver arriba: quien ordena sigue mirando la tabla.
    iniciarTransicion(() => router.push(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-cuerpo text-sm text-texto-secundario">
        <span>Intensidad frente al líder de cada columna:</span>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {NIVELES_DE_LEYENDA.map((nivel) => (
            <li key={nivel} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-3 w-5 rounded ${ESTILOS.total[nivel]}`} />
              {ETIQUETA_NIVEL[nivel]}
              {UMBRAL_DE_LEYENDA[nivel] && <span className="text-texto-secundario/80"> {UMBRAL_DE_LEYENDA[nivel]}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className={`overflow-auto transition-opacity md:max-h-[44rem] ${pendiente ? "opacity-60" : ""}`} aria-busy={pendiente}>
        <table className="w-full border-separate [border-spacing:0_6px]">
          <caption className="sr-only">Clics de WhatsApp, de Instagram y totales de cada emprendimiento en el período, con su evolución y su tendencia.</caption>
          <thead>
            <tr>
              <th scope="col" className={`${ENCABEZADO_FIJO} w-7 text-center`}>
                #
              </th>
              <th scope="col" className={`${ENCABEZADO_FIJO} text-left`}>
                Emprendimiento
              </th>
              <EncabezadoOrdenable etiquetaLarga="WhatsApp" etiquetaCorta="WA" valor="whatsapp" actual={orden} alOrdenar={ordenar} />
              <EncabezadoOrdenable etiquetaLarga="Instagram" etiquetaCorta="IG" valor="instagram" actual={orden} alOrdenar={ordenar} />
              <EncabezadoOrdenable etiquetaLarga="Total" etiquetaCorta="Total" valor="total" actual={orden} alOrdenar={ordenar} />
              <th scope="col" className={`${ENCABEZADO_FIJO} hidden text-center md:table-cell`}>
                % del total
              </th>
              <th scope="col" className={`${ENCABEZADO_FIJO} hidden text-center xl:table-cell`}>
                Evolución
              </th>
              <th scope="col" className={`${ENCABEZADO_FIJO} hidden text-center xl:table-cell`}>
                Tendencia
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, indice) => {
              const serie = serieDeFila(fila.celdas);
              const cuota = calcularCuota(fila.total, totalPeriodo);
              const etiquetaEvolucion = `Evolución de ${fila.nombre_negocio} en el período, por ${UNIDAD_POR_GRANULARIDAD[granularidad]}: máximo de ${Math.max(...serie)} clics.`;
              return (
                <tr key={fila.perfil_id}>
                  <td className="px-1 text-center font-cuerpo text-sm font-medium text-texto-secundario tabular-nums">{indice + 1}</td>
                  <th scope="row" className="w-full max-w-0 px-1.5 text-left font-normal">
                    <div className="flex items-center gap-3">
                      {/* Sin avatar debajo de `sm`: a 360 px el nombre necesita todo el ancho. Se oculta el contenedor y no
                          el avatar, porque el átomo ya trae su propio `inline-flex` y chocaría con `hidden`. */}
                      <span className="hidden sm:inline-flex">
                        <Avatar nombreCompleto={fila.nombre_negocio} tamano="md" />
                      </span>
                      <div className="min-w-0">
                        {/* Hasta dos líneas en pantallas angostas (el nombre es la identidad de la fila y a 360 px solo
                            sobran ~100 px); una sola, con puntos suspensivos, desde `md`. */}
                        <span className="line-clamp-2 block font-titulo text-base font-bold text-texto sm:text-[1.0625rem] md:line-clamp-1">
                          <EnlaceNegocio perfilId={fila.perfil_id} nombre={fila.nombre_negocio} />
                        </span>
                        {identidades[fila.perfil_id] && (
                          <span className="line-clamp-2 block font-cuerpo text-sm text-texto-secundario md:line-clamp-1">
                            <RubroCiudad identidad={identidades[fila.perfil_id]} />
                          </span>
                        )}
                        {/* Debajo de `xl` no caben las columnas de evolución y tendencia junto al avatar y al rubro: se resumen aquí. */}
                        <span className="mt-0.5 flex items-center gap-1.5 xl:hidden">
                          <EvolucionMini serie={serie} etiqueta={etiquetaEvolucion} className="h-4 w-12 shrink-0" />
                          <TendenciaClics fila={fila} />
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="px-0.5">
                    <Celda valor={fila.whatsapp} nivel={nivelCalor(fila.whatsapp, lideres.whatsapp)} columna="whatsapp" />
                  </td>
                  <td className="px-0.5">
                    <Celda valor={fila.instagram} nivel={nivelCalor(fila.instagram, lideres.instagram)} columna="instagram" />
                  </td>
                  <td className="px-0.5">
                    <Celda valor={fila.total} nivel={nivelCalor(fila.total, lideres.total)} columna="total" />
                  </td>
                  <td className="hidden px-1.5 text-center font-cuerpo text-base font-semibold text-texto tabular-nums md:table-cell">
                    {cuota === null ? <span className="text-texto-secundario">—</span> : formatearPorcentaje(Math.round(cuota * 10) / 10)}
                  </td>
                  <td className="hidden px-1.5 xl:table-cell">
                    <EvolucionMini serie={serie} etiqueta={etiquetaEvolucion} className="mx-auto h-7 w-20" />
                  </td>
                  <td className="hidden px-1.5 text-center xl:table-cell">
                    <TendenciaClics fila={fila} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="font-cuerpo text-xs text-texto-secundario">
        Tendencia: frente al período anterior de igual duración. Evolución: forma del período por {UNIDAD_POR_GRANULARIDAD[granularidad]} de cada
        emprendimiento, con su propia escala.
      </p>
    </div>
  );
}
