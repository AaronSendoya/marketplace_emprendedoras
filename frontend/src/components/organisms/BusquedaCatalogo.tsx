"use client";

import { SearchX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";

interface ValorBusqueda {
  // Una navegación de la búsqueda está en curso: la página pide los resultados nuevos al servidor.
  pendiente: boolean;
  // Quien busca escribió algo y todavía no se envió (la espera del debounce). Solo sirve para decir "Buscando…" desde
  // la primera pulsación, sin esperar a que salga la petición.
  escribiendo: boolean;
  setEscribiendo: (escribiendo: boolean) => void;
  // Ejecuta una navegación como transición, para que `pendiente` la refleje y la página anterior siga a la vista
  // hasta que lleguen los resultados nuevos.
  iniciarTransicion: (accion: () => void) => void;
  // Cuántas veces se pidió "Limpiar filtros": la caja de búsqueda vacía su texto cada vez que cambia, también el que
  // todavía no se había enviado.
  limpiezas: number;
  limpiarFiltros: (ruta: string) => void;
}

const ContextoBusqueda = createContext<ValorBusqueda | null>(null);

// Comparte el estado "buscando" entre la barra de filtros (que lo provoca y lo muestra en su contador) y la zona de
// resultados (que se atenúa mientras llegan los nuevos), que son hermanas en la página. Sin esto, cada una solo sabría
// de sí misma (CLAUDE.md sección 5, búsqueda en vivo de emprendedoras).
export function BusquedaProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();
  const [escribiendo, setEscribiendo] = useState(false);
  const [limpiezas, setLimpiezas] = useState(0);

  function limpiarFiltros(ruta: string) {
    setLimpiezas((cantidad) => cantidad + 1);
    iniciarTransicion(() => router.push(ruta));
  }

  return (
    <ContextoBusqueda.Provider value={{ pendiente, escribiendo, setEscribiendo, iniciarTransicion, limpiezas, limpiarFiltros }}>
      {children}
    </ContextoBusqueda.Provider>
  );
}

// `null` fuera de un `BusquedaProvider`: las páginas que no tienen búsqueda en vivo (Promociones) usan la barra de
// filtros sin él y se comportan como siempre.
export function useBusqueda(): ValorBusqueda | null {
  return useContext(ContextoBusqueda);
}

interface PropsResultadosBusqueda {
  children: ReactNode;
  className?: string;
}

// Envuelve lo que cambia con la búsqueda (la rejilla, el estado vacío y el paginador). Mientras llegan los resultados
// nuevos se ven los anteriores un poco atenuados y `aria-busy` lo anuncia a quien usa un lector de pantalla: la página
// nunca se queda en blanco ni salta. Solo `opacity` (CLAUDE.md sección 6, regla 6).
export function ResultadosBusqueda({ children, className = "" }: PropsResultadosBusqueda) {
  const pendiente = useBusqueda()?.pendiente ?? false;

  return (
    <div aria-busy={pendiente} className={`transition-opacity duration-150 ${pendiente ? "opacity-60" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}

interface PropsSinResultadosBusqueda {
  // La página sin ningún filtro, a la que lleva "Limpiar filtros".
  ruta: string;
  // Lo que se busca, en plural y en minúsculas, para el texto ("emprendedoras", "productos").
  plural: string;
}

// Lo que se ve cuando los filtros no dejan ninguna coincidencia: lo dice y ofrece lo único que tiene sentido hacer,
// quitarlos todos de una vez (texto, ciudad y rubro). Solo para una búsqueda que no encontró nada; un catálogo vacío
// sin filtros no lleva este botón porque no hay nada que limpiar.
export function SinResultadosBusqueda({ ruta, plural }: PropsSinResultadosBusqueda) {
  const busqueda = useBusqueda();
  if (!busqueda) throw new Error("SinResultadosBusqueda va dentro de un BusquedaProvider.");

  return (
    <EstadoVacio
      icono={SearchX}
      titulo="No encontramos resultados para tu búsqueda"
      descripcion={`Revisa la ortografía, prueba con otras palabras o quita algún filtro para ver más ${plural}.`}
      accion={{ etiqueta: "Limpiar filtros", onClick: () => busqueda.limpiarFiltros(ruta) }}
      className="bg-superficie"
    />
  );
}

interface PropsEncabezadoResultados {
  // Total de resultados con los filtros actuales (el de la paginación) y cómo se llama lo que se lista.
  total: number;
  unidades: [singular: string, plural: string];
  ciudades: ReferenciaCatalogo[];
  rubros: ReferenciaCatalogo[];
}

// El contador de resultados, justo encima de las tarjetas (CLAUDE.md sección 6, regla 14, punto c): une los filtros con lo que
// filtran. Dice cuántos hay y, si hay filtros, cuáles (el texto, la ciudad y el rubro, tal como están en la URL). Mientras llegan
// los resultados nuevos dice «Buscando…». Va dentro de `ResultadosBusqueda`, así que se atenúa con ellos.
export function EncabezadoResultados({ total, unidades, ciudades, rubros }: PropsEncabezadoResultados) {
  const busqueda = useBusqueda();
  const parametros = useSearchParams();
  const buscando = busqueda !== null && (busqueda.pendiente || busqueda.escribiendo);

  const texto = parametros.get("q")?.trim();
  const ciudad = ciudades.find((c) => c.id === parametros.get("ciudad_id"))?.nombre;
  const rubro = rubros.find((r) => r.id === parametros.get("rubro_id"))?.nombre;
  const filtros = [texto ? `«${texto}»` : null, ciudad ? `en ${ciudad}` : null, rubro ? `rubro ${rubro}` : null].filter(Boolean);

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-live="polite">
      <h2 className="font-titulo text-xl font-extrabold text-texto">
        {buscando ? (
          "Buscando…"
        ) : (
          <>
            <span className="tabular-nums">{total}</span> {total === 1 ? unidades[0] : unidades[1]}
          </>
        )}
      </h2>
      {filtros.length > 0 && !buscando && <p className="min-w-0 font-cuerpo text-sm break-words text-texto-secundario">{filtros.join(" · ")}</p>}
    </div>
  );
}
