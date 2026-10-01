"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterSelect } from "@/components/molecules/FilterSelect";
import { SearchBar } from "@/components/molecules/SearchBar";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";

const OPCIONES_ESTADO: ReferenciaCatalogo[] = [
  { id: "activo", nombre: "Activas" },
  { id: "inactivo", nombre: "Suspendidas" },
];

// Buscador y filtro de estado del listado de cuentas (regla 5), mismo patrón que CatalogToolbar:
// actualiza la URL (q, estado) para que el Server Component de /admin reaccione; cambiar
// cualquiera de los dos vuelve a la página 1.
export function AdminToolbar() {
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchBar
        valorInicial={searchParams.get("q") ?? ""}
        onBuscar={(valor) => actualizarParametro("q", valor)}
        placeholder="Buscar por nombre, apellido o correo..."
        className="flex-1"
      />
      <FilterSelect
        opciones={OPCIONES_ESTADO}
        valor={searchParams.get("estado") ?? ""}
        etiquetaTodas="Todos los estados"
        onChange={(valor) => actualizarParametro("estado", valor)}
        ariaLabel="Estado"
        className="sm:w-48"
      />
    </div>
  );
}
