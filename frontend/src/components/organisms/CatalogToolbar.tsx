"use client";

import { MapPin, Tag } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic } from "react";
import { FilterSelect } from "@/components/molecules/FilterSelect";
import { FiltroChips } from "@/components/molecules/FiltroChips";
import { SearchBar } from "@/components/molecules/SearchBar";
import { useBusqueda } from "@/components/organisms/BusquedaCatalogo";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";

interface PropsCatalogToolbar {
  ciudades: ReferenciaCatalogo[];
  rubros: ReferenciaCatalogo[];
  placeholderBusqueda?: string;
}

interface Filtros {
  q: string;
  ciudad_id: string;
  rubro_id: string;
}

// Único tramo con estado del navegador de las páginas de catálogo (sección 2 del plan: buscador
// y selects de filtro). Los tres controles actualizan la URL (q, ciudad_id, rubro_id) para que el
// resultado sea enlazable y el Server Component de la página reaccione al cambiar sus
// searchParams (sección 5.3 del plan); cambiar cualquier filtro vuelve a la página 1.
//
// Regla 14 (CLAUDE.md sección 6): una sola superficie con borde y sombra para el buscador, la ciudad, el rubro y
// los chips, que se superpone 32 px al borde inferior del banner (`CatalogHeader` reserva ese espacio). El total de
// resultados no va aquí: está justo encima de las tarjetas (`EncabezadoResultados`). Los campos van en una fila desde `md`, en dos desde `sm` (el buscador ocupa la fila
// de arriba) y apilados en móvil. `min-w-0` en cada nivel: la fila de chips se desplaza en horizontal en móvil
// y, sin él, ensancharía toda la página.
//
// Búsqueda en vivo (CLAUDE.md sección 5): si la página lo envuelve en un `BusquedaProvider` (Emprendedoras), el texto
// se busca mientras se escribe (con un retraso), el encabezado de resultados dice "Buscando…" hasta que llegan y la
// ciudad y el rubro elegidos se ven al instante, sin esperar a la respuesta. Sin él (Promociones) todo es como siempre:
// el texto se envía con Enter y cada cambio es una navegación.
export function CatalogToolbar({ ciudades, rubros, placeholderBusqueda }: PropsCatalogToolbar) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const busqueda = useBusqueda();

  const filtrosEnUrl: Filtros = {
    q: searchParams.get("q") ?? "",
    ciudad_id: searchParams.get("ciudad_id") ?? "",
    rubro_id: searchParams.get("rubro_id") ?? "",
  };
  // Lo que ya se pidió aunque la URL aún no lo refleje (la navegación espera la respuesta del servidor). Armar la
  // dirección nueva desde aquí, y no desde la URL, evita que un filtro elegido con una búsqueda en camino la pierda.
  // Sin búsqueda en vivo nunca se actualiza y es la propia URL.
  const [filtros, recordarFiltro] = useOptimistic(filtrosEnUrl, (actuales, cambio: Partial<Filtros>) => ({ ...actuales, ...cambio }));

  function actualizarParametro(clave: keyof Filtros, valor: string) {
    const parametros = new URLSearchParams(searchParams.toString());
    for (const [nombre, texto] of Object.entries({ ...filtros, [clave]: valor })) {
      if (texto) {
        parametros.set(nombre, texto);
      } else {
        parametros.delete(nombre);
      }
    }
    parametros.delete("pagina");
    const query = parametros.toString();
    const destino = query ? `${pathname}?${query}` : pathname;

    if (!busqueda) {
      router.push(destino);
      return;
    }
    busqueda.iniciarTransicion(() => {
      recordarFiltro({ [clave]: valor });
      // Cada pausa al escribir reemplaza la entrada del historial (no es una página a la que volver); elegir una
      // ciudad o un rubro sí es un paso que "Atrás" deshace.
      if (clave === "q") {
        router.replace(destino);
      } else {
        router.push(destino);
      }
    });
  }

  return (
    <div className="relative z-10 -mt-8 min-w-0 animate-entrada space-y-4 rounded-superficie border border-borde bg-superficie p-4 shadow-tarjeta-hover sm:p-5">
      <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_13rem_12.5rem] lg:grid-cols-[minmax(0,1fr)_14.5rem_15.5rem]">
        <SearchBar
          variante="catalogo"
          valorInicial={filtrosEnUrl.q}
          onBuscar={(valor) => actualizarParametro("q", valor)}
          placeholder={placeholderBusqueda}
          enVivo={busqueda !== null}
          onEscribiendo={busqueda?.setEscribiendo}
          reinicios={busqueda?.limpiezas}
          className="sm:col-span-2 md:col-span-1"
        />
        <FilterSelect
          variante="catalogo"
          opciones={ciudades}
          valor={filtros.ciudad_id}
          etiquetaTodas="Todas las ciudades"
          onChange={(valor) => actualizarParametro("ciudad_id", valor)}
          ariaLabel="Ciudad"
          icono={<MapPin size={17} strokeWidth={1.75} />}
        />
        <FilterSelect
          variante="catalogo"
          opciones={rubros}
          valor={filtros.rubro_id}
          etiquetaTodas="Todos los rubros"
          onChange={(valor) => actualizarParametro("rubro_id", valor)}
          ariaLabel="Rubro"
          icono={<Tag size={17} strokeWidth={1.75} />}
        />
      </div>

      <div className="min-w-0 border-t border-borde pt-4">
        <FiltroChips
          opciones={rubros}
          valor={filtros.rubro_id}
          onChange={(valor) => actualizarParametro("rubro_id", valor)}
          etiquetaTodas="Todos los rubros"
        />
      </div>
    </div>
  );
}
