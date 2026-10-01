"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterSelect } from "@/components/molecules/FilterSelect";
import { FiltroChips } from "@/components/molecules/FiltroChips";
import { SearchBar } from "@/components/molecules/SearchBar";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";

interface PropsCatalogToolbar {
  ciudades: ReferenciaCatalogo[];
  rubros: ReferenciaCatalogo[];
}

// Único tramo con estado del navegador de las páginas de catálogo (sección 2 del plan: buscador
// y selects de filtro). Los tres controles actualizan la URL (q, ciudad_id, rubro_id) para que el
// resultado sea enlazable y el Server Component de la página reaccione al cambiar sus
// searchParams (sección 5.3 del plan); cambiar cualquier filtro vuelve a la página 1.
export function CatalogToolbar({ ciudades, rubros }: PropsCatalogToolbar) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function actualizarParametro(clave: string, valor: string) {
    const parametros = new URLSearchParams(searchParams.toString());
    if (valor) {
      parametros.set(clave, valor);
    } else {
      parametros.delete(clave);
    }
    parametros.delete("pagina");
    const query = parametros.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          valorInicial={searchParams.get("q") ?? ""}
          onBuscar={(valor) => actualizarParametro("q", valor)}
          className="flex-1"
        />
        <FilterSelect
          opciones={ciudades}
          valor={searchParams.get("ciudad_id") ?? ""}
          etiquetaTodas="Todas las ciudades"
          onChange={(valor) => actualizarParametro("ciudad_id", valor)}
          ariaLabel="Ciudad"
          className="sm:w-48"
        />
        <FilterSelect
          opciones={rubros}
          valor={searchParams.get("rubro_id") ?? ""}
          etiquetaTodas="Todos los rubros"
          onChange={(valor) => actualizarParametro("rubro_id", valor)}
          ariaLabel="Rubro"
          className="sm:w-48"
        />
      </div>

      <FiltroChips
        opciones={rubros}
        valor={searchParams.get("rubro_id") ?? ""}
        onChange={(valor) => actualizarParametro("rubro_id", valor)}
        etiquetaTodas="Todos los rubros"
      />
    </div>
  );
}
