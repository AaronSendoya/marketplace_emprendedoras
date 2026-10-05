"use client";

import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import { ProductoFormularioModal } from "@/components/organisms/ProductoFormularioModal";
import type { ProductoPropio } from "@/lib/api/tipos";
import { CLASES_TARJETA_NEGOCIO } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";
import { formatearPorcentaje, formatearPrecio } from "@/lib/formato/precio";
import { ACCIONES_PRODUCTO_NEGOCIO } from "@/lib/negocio/acciones-formularios";
import { cambiarEstadoProductoNegocioAction } from "@/lib/negocio/productos-acciones";

interface PropsTarjetaProductoNegocio {
  producto: ProductoPropio;
}

type ModalAbierto = "editar" | "estado" | null;

// Una tarjeta por producto, con las dos cosas que la emprendedora hace con él a la vista: editarlo y
// decidir si sus clientes lo ven. "Publicado"/"Oculto" es el vocabulario del panel para el `activo`
// del backend (CLAUDE.md sección 6, regla 11); ocultar no borra nada.
export function TarjetaProductoNegocio({ producto }: PropsTarjetaProductoNegocio) {
  const [modalAbierto, setModalAbierto] = useState<ModalAbierto>(null);
  const imagenUsable = esUrlDeImagenUsable(producto.imagen_url);
  const conDescuento = producto.porcentaje !== null && producto.precio_con_descuento !== null;

  return (
    <article className={CLASES_TARJETA_NEGOCIO}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-fondo">
        {imagenUsable ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
            className={`object-cover ${producto.activo ? "" : "opacity-60"}`}
          />
        ) : (
          <MarcadorImagen etiqueta={producto.nombre} className="h-full w-full" />
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 font-titulo text-[15px] leading-snug font-bold break-words text-texto">{producto.nombre}</h3>
            <Badge variante={producto.activo ? "exito" : "neutro"} className="shrink-0">
              {producto.activo ? "Publicado" : "Oculto"}
            </Badge>
          </div>

          {producto.precio === null ? (
            <p className="font-cuerpo text-sm text-texto-secundario">Sin precio</p>
          ) : (
            <p className="flex flex-wrap items-baseline gap-x-2 font-cuerpo text-sm text-texto-secundario">
              {conDescuento ? (
                <>
                  <span className="font-semibold text-texto">{formatearPrecio(producto.precio_con_descuento!)}</span>
                  <span className="line-through">{formatearPrecio(producto.precio)}</span>
                  <span className="rounded-full bg-secundario-suave px-2 py-0.5 text-xs font-semibold text-secundario">
                    -{formatearPorcentaje(producto.porcentaje!)}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-texto">{formatearPrecio(producto.precio)}</span>
              )}
              {!producto.mostrar_precio && <span className="text-xs">Precio oculto al público</span>}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variante="secundario" onClick={() => setModalAbierto("editar")} className="min-h-10 flex-1">
            Editar
          </Button>
          <Button variante="secundario" onClick={() => setModalAbierto("estado")} className="min-h-10 flex-1">
            {producto.activo ? "Ocultar" : "Publicar"}
          </Button>
        </div>
      </div>

      <ProductoFormularioModal producto={producto} abierto={modalAbierto === "editar"} onCerrar={() => setModalAbierto(null)} acciones={ACCIONES_PRODUCTO_NEGOCIO} />

      <ConfirmModal
        abierto={modalAbierto === "estado"}
        onCerrar={() => setModalAbierto(null)}
        onConfirmar={() => cambiarEstadoProductoNegocioAction(producto.id, !producto.activo)}
        titulo={producto.activo ? "¿Ocultar este producto?" : "¿Publicar este producto?"}
        descripcion={
          producto.activo
            ? "Deja de mostrarse en tu catálogo. No se borra nada: puedes publicarlo otra vez cuando quieras."
            : "Vuelve a mostrarse en tu catálogo."
        }
        textoConfirmar={producto.activo ? "Ocultar" : "Publicar"}
      />
    </article>
  );
}
