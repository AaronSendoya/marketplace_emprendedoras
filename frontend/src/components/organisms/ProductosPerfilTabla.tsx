"use client";

import { Package } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { MenuAccionesProducto } from "@/components/organisms/MenuAccionesProducto";
import { ProductoFormularioModal } from "@/components/organisms/ProductoFormularioModal";
import type { ProductoPropio } from "@/lib/api/tipos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";
import { formatearPrecio } from "@/lib/formato/precio";

interface PropsProductosPerfilTabla {
  perfilId: string;
  usuarioId: string;
  productos: ProductoPropio[];
}

export function ProductosPerfilTabla({ perfilId, usuarioId, productos }: PropsProductosPerfilTabla) {
  const [crearAbierto, setCrearAbierto] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-borde bg-superficie">
      <div className="flex items-center justify-between gap-4 border-b border-borde p-4">
        <h2 className="font-titulo text-base font-bold text-texto">Productos</h2>
        <Button onClick={() => setCrearAbierto(true)}>Agregar producto</Button>
      </div>

      {productos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Package size={28} strokeWidth={1.5} aria-hidden="true" className="text-texto-secundario" />
          <p className="font-cuerpo text-sm text-texto-secundario">Todavía no hay productos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-cuerpo text-sm">
            <thead className="border-b border-borde bg-fondo">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                  Producto
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                  Precio
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                  Estado
                </th>
                <th scope="col" className="w-12 px-2 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {productos.map((producto) => {
                const imagenUsable = esUrlDeImagenUsable(producto.imagen_url);
                return (
                  <tr key={producto.id} className="transition-colors hover:bg-fondo/60">
                    <td className="px-4 py-3 text-texto">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-borde bg-fondo">
                          {imagenUsable ? (
                            <Image src={producto.imagen_url} alt={producto.nombre} fill sizes="40px" className="object-cover" />
                          ) : (
                            <MarcadorImagen etiqueta={producto.nombre} className="h-full w-full" />
                          )}
                        </div>
                        <span className="font-medium">{producto.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-texto-secundario">
                      {producto.precio === null ? "Sin precio" : formatearPrecio(producto.precio)}
                      {producto.precio !== null && !producto.mostrar_precio && (
                        <span className="ml-2 font-cuerpo text-xs text-texto-secundario">(oculto)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variante={producto.activo ? "neutro" : "acento"}>{producto.activo ? "Activo" : "Inactivo"}</Badge>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <MenuAccionesProducto producto={producto} usuarioId={usuarioId} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductoFormularioModal perfilId={perfilId} usuarioId={usuarioId} producto={null} abierto={crearAbierto} onCerrar={() => setCrearAbierto(false)} />
    </div>
  );
}
