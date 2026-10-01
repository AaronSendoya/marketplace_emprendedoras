"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/molecules/SearchBar";

// Solo buscador: a diferencia de AdminToolbar (Cuentas), esta lista siempre se queda en cuentas
// activas (regla del módulo "Emprendimientos" — sin perfil o estado de cuenta acá), así que no
// hace falta el filtro de estado.
export function EmprendimientosToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buscar(valor: string) {
    const parametros = new URLSearchParams(searchParams.toString());
    if (valor) {
      parametros.set("q", valor);
    } else {
      parametros.delete("q");
    }
    parametros.delete("pagina");
    const query = parametros.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <SearchBar
      valorInicial={searchParams.get("q") ?? ""}
      onBuscar={buscar}
      placeholder="Buscar por nombre, apellido o correo..."
    />
  );
}
