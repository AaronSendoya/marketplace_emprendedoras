"use client";

import { Package } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { MenuAccionesProducto } from "@/components/organisms/MenuAccionesProducto";
import { ProductoFormularioModal } from "@/components/organisms/ProductoFormularioModal";
import type { ProductoPropio } from "@/lib/api/tipos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";
import { formatearPrecio } from "@/lib/formato/precio";

interface PropsProductosPerfilGrid {
  perfilId: string;
  usuarioId: string;
  productos: ProductoPropio[];
}

// Grilla de tarjetas (mismo lenguaje visual que ProductoCard del catálogo público: imagen
// aspect-[4/3], nombre, precio, badge de estado) en vez de una tabla: el Admin ve básicamente lo
// mismo que vería un visitante del catálogo, no solo texto plano por fila.
export function ProductosPerfilGrid({ perfilId, usuarioId, productos }: PropsProductosPerfilGrid) {
  const [crearAbierto, setCrearAbierto] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h2 className="font-titulo text-base font-bold text-texto">Productos</h2>
        <Button onClick={() => setCrearAbierto(true)} className="w-full min-h-11 lg:min-h-0 sm:w-auto">
          Agregar producto
        </Button>
      </div>

      {productos.length === 0 ? (
        <div className="rounded-lg border border-borde bg-superficie p-4">
          <EstadoVacio
            icono={Package}
            titulo="Sin productos"
            descripcion="Agrega el primer producto para que sea visible en el catálogo."
            accion={{ etiqueta: "Agregar producto", onClick: () => setCrearAbierto(true) }}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => {
            const imagenUsable = esUrlDeImagenUsable(producto.imagen_url);
            return (
              <article key={producto.id} className="rounded-lg border border-borde bg-superficie">
                {/* El recorte va solo acá, no en el <article>: el menú de tres puntos de abajo se
                    posiciona `absolute` y necesita poder salirse del borde de la tarjeta sin que
                    un overflow-hidden del contenedor completo se lo corte. */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-fondo">
                  {imagenUsable ? (
                    <Image
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <MarcadorImagen etiqueta={producto.nombre} className="h-full w-full" />
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-cuerpo text-sm font-medium text-texto">{producto.nombre}</p>
                    <MenuAccionesProducto producto={producto} usuarioId={usuarioId} />
                  </div>
                  <p className="font-cuerpo text-xs text-texto-secundario">
                    {producto.precio === null ? "Sin precio" : formatearPrecio(producto.precio)}
                    {producto.precio !== null && !producto.mostrar_precio && " (oculto)"}
                  </p>
                  <Badge variante={producto.activo ? "neutro" : "acento"} punto>
                    {producto.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ProductoFormularioModal perfilId={perfilId} usuarioId={usuarioId} producto={null} abierto={crearAbierto} onCerrar={() => setCrearAbierto(false)} />
    </div>
  );
}
