"use client";

import { Percent } from "lucide-react";
import { useState } from "react";
import { Badge, type VarianteBadge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { DescuentoFormularioModal } from "@/components/organisms/DescuentoFormularioModal";
import { MenuAccionesDescuento } from "@/components/organisms/MenuAccionesDescuento";
import type { Descuento, ProductoPropio } from "@/lib/api/tipos";

interface PropsDescuentosPerfilTabla {
  perfilId: string;
  usuarioId: string;
  descuentos: Descuento[];
  productos: ProductoPropio[];
}

const VARIANTE_POR_ESTADO: Record<Descuento["estado"], VarianteBadge> = {
  programado: "neutro",
  vigente: "secundario",
  vencido: "acento",
};

const ETIQUETA_POR_ESTADO: Record<Descuento["estado"], string> = {
  programado: "Programado",
  vigente: "Vigente",
  vencido: "Vencido",
};

export function DescuentosPerfilTabla({ perfilId, usuarioId, descuentos, productos }: PropsDescuentosPerfilTabla) {
  const [crearAbierto, setCrearAbierto] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-borde bg-superficie">
      <div className="flex items-center justify-between gap-4 border-b border-borde p-4">
        <h2 className="font-titulo text-base font-bold text-texto">Descuentos</h2>
        <Button onClick={() => setCrearAbierto(true)}>Crear descuento</Button>
      </div>

      {descuentos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Percent size={28} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
          <p className="font-cuerpo text-sm text-texto-secundario">Todavía no hay descuentos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-cuerpo text-sm">
            <thead className="border-b border-borde bg-fondo">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                  Porcentaje
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                  Vigencia
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                  Productos
                </th>
                <th scope="col" className="w-12 px-2 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {descuentos.map((descuento) => (
                <tr key={descuento.id} className="transition-colors hover:bg-fondo/60">
                  <td className="px-4 py-3 font-medium text-texto">{descuento.porcentaje}%</td>
                  <td className="px-4 py-3">
                    <Badge variante={VARIANTE_POR_ESTADO[descuento.estado]}>{ETIQUETA_POR_ESTADO[descuento.estado]}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-texto-secundario">
                    {descuento.producto_ids.length} {descuento.producto_ids.length === 1 ? "producto" : "productos"}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <MenuAccionesDescuento descuento={descuento} productos={productos} usuarioId={usuarioId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DescuentoFormularioModal perfilId={perfilId} usuarioId={usuarioId} descuento={null} abierto={crearAbierto} onCerrar={() => setCrearAbierto(false)} />
    </div>
  );
}
