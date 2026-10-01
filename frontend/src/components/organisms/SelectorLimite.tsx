"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/atoms/Select";

const OPCIONES = [10, 50, 100];

interface PropsSelectorLimite {
  valor: number;
}

// Cuántas filas se piden por página (regla 5: el backend acepta hasta 100). Cambiarlo actualiza la
// URL (`limite`) y vuelve a la página 1, mismo patrón que el resto de los filtros del panel.
export function SelectorLimite({ valor }: PropsSelectorLimite) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function cambiar(nuevoLimite: string) {
    const parametros = new URLSearchParams(searchParams.toString());
    parametros.set("limite", nuevoLimite);
    parametros.delete("pagina");
    router.push(`${pathname}?${parametros.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 font-cuerpo text-sm text-texto-secundario">
      Mostrar
      <Select value={String(valor)} onChange={(evento) => cambiar(evento.target.value)} aria-label="Cuentas por página" className="w-auto">
        {OPCIONES.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
      </Select>
    </label>
  );
}
