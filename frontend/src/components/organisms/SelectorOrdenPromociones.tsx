"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useTransition } from "react";
import { Select } from "@/components/atoms/Select";
import type { OrdenPromociones } from "@/lib/api/tipos";

// Las opciones del orden de las promociones (CLAUDE.md sección 6, regla 14, punto l). «Al azar» es el de por defecto: no lleva parámetro y la
// página inventa una semilla nueva; los otros dos van en `orden` y no necesitan semilla.
const OPCIONES: { valor: OrdenPromociones; etiqueta: string }[] = [
  { valor: "aleatorio", etiqueta: "Al azar (cambia en cada visita)" },
  { valor: "mayor_descuento", etiqueta: "Mayor descuento" },
  { valor: "termina_pronto", etiqueta: "Termina pronto" },
];

interface PropsSelectorOrdenPromociones {
  // El orden con el que se pidió la lista, ya resuelto por la página.
  orden: OrdenPromociones;
}

// El único tramo con estado de la barra de orden de Promociones: cambiar el orden actualiza la dirección (`orden`) y vuelve a la primera
// página, conservando el texto, la ciudad y el rubro. Un enlace como el resto de los filtros: se puede compartir y «Atrás» lo deshace.
export function SelectorOrdenPromociones({ orden }: PropsSelectorOrdenPromociones) {
  const router = useRouter();
  const pathname = usePathname();
  const parametros = useSearchParams();
  const [pendiente, iniciarTransicion] = useTransition();
  const id = useId();

  function elegir(valor: string) {
    const siguiente = new URLSearchParams(parametros.toString());
    siguiente.delete("pagina");
    siguiente.delete("semilla");
    if (valor === "aleatorio") siguiente.delete("orden");
    else siguiente.set("orden", valor);
    const query = siguiente.toString();
    iniciarTransicion(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  return (
    <div className="flex items-center gap-2.5 font-cuerpo text-sm text-texto-secundario" aria-busy={pendiente}>
      <label htmlFor={id}>Orden</label>
      <div className="relative">
        <Select id={id} value={orden} onChange={(evento) => elegir(evento.target.value)} className="h-10 w-auto appearance-none rounded-lg border-borde-fuerte py-0 pr-9 pl-3 font-medium">
          {OPCIONES.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </Select>
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-texto-secundario" />
      </div>
    </div>
  );
}
