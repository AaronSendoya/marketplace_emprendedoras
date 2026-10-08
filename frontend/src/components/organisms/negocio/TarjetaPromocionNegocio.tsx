"use client";

import { ImagenR2 } from "@/components/atoms/ImagenR2";
import { useState } from "react";
import { Badge, type VarianteBadge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { AsignarProductosModal } from "@/components/organisms/AsignarProductosModal";
import { DescuentoFormularioModal } from "@/components/organisms/DescuentoFormularioModal";
import type { Descuento, ProductoPropio } from "@/lib/api/tipos";
import { CLASES_TARJETA_NEGOCIO } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";
import { formatearPorcentaje } from "@/lib/formato/precio";
import { ACCIONES_ASIGNACION_NEGOCIO, accionesDescuentoNegocio } from "@/lib/negocio/acciones-formularios";
import { ETIQUETA_ESTADO_PROMOCION, textoVigencia } from "@/lib/negocio/vigencia";

interface PropsTarjetaPromocionNegocio {
  descuento: Descuento;
  perfilId: string;
  productos: ProductoPropio[];
}

type ModalAbierto = "editar" | "productos" | null;

const VARIANTE_POR_ESTADO: Record<Descuento["estado"], VarianteBadge> = {
  programado: "neutro",
  vigente: "secundario",
  vencido: "neutro",
};

// Cuántas miniaturas de productos se muestran antes de resumir el resto en "+N".
const TOPE_MINIATURAS = 6;

export function TarjetaPromocionNegocio({ descuento, perfilId, productos }: PropsTarjetaPromocionNegocio) {
  const [modalAbierto, setModalAbierto] = useState<ModalAbierto>(null);

  const productoPorId = new Map(productos.map((producto) => [producto.id, producto]));
  const asignados = descuento.producto_ids
    .map((id) => productoPorId.get(id))
    .filter((producto): producto is ProductoPropio => producto !== undefined);
  const visibles = asignados.slice(0, TOPE_MINIATURAS);
  const restantes = asignados.length - visibles.length;

  return (
    <article className={`flex flex-col gap-4 p-5 ${CLASES_TARJETA_NEGOCIO}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-titulo text-3xl font-extrabold text-secundario">{formatearPorcentaje(descuento.porcentaje)}</p>
          <p className="mt-1 font-cuerpo text-sm text-texto-secundario">{textoVigencia(descuento)}</p>
        </div>
        <Badge variante={VARIANTE_POR_ESTADO[descuento.estado]} className="shrink-0">
          {ETIQUETA_ESTADO_PROMOCION[descuento.estado]}
        </Badge>
      </div>

      {/* Detalle (regla 8): completo, con sus saltos de línea; son 280 caracteres como máximo. */}
      {descuento.descripcion && <p className="font-cuerpo text-sm break-words whitespace-pre-line text-texto">{descuento.descripcion}</p>}

      <div className="flex-1 border-t border-borde pt-4">
        {asignados.length === 0 ? (
          <p className="font-cuerpo text-sm text-texto-secundario">Todavía no tiene productos: no le descuenta nada a nadie.</p>
        ) : (
          <>
            <p className="font-cuerpo text-sm font-medium text-texto">
              {asignados.length} {asignados.length === 1 ? "producto" : "productos"}
            </p>
            <ul aria-label="Productos de esta promoción" className="mt-2 flex flex-wrap items-center gap-1.5">
              {visibles.map((producto) => (
                <li key={producto.id} title={producto.nombre} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-borde bg-fondo">
                  {esUrlDeImagenUsable(producto.imagen_url) ? (
                    <ImagenR2 src={producto.imagen_url} alt={producto.nombre} fill sizes="40px" className="object-cover" />
                  ) : (
                    <MarcadorImagen etiqueta={producto.nombre} className="h-full w-full" />
                  )}
                </li>
              ))}
              {restantes > 0 && <li className="pl-1 font-cuerpo text-xs text-texto-secundario">+{restantes}</li>}
            </ul>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button variante="secundario" onClick={() => setModalAbierto("editar")} className="min-h-10 px-5">
          Editar
        </Button>
        <Button variante="promocion" onClick={() => setModalAbierto("productos")} className="min-h-10 flex-1 whitespace-nowrap">
          Elegir productos
        </Button>
      </div>

      <DescuentoFormularioModal
        descuento={descuento}
        abierto={modalAbierto === "editar"}
        onCerrar={() => setModalAbierto(null)}
        acciones={accionesDescuentoNegocio(perfilId)}
        etiqueta="promoción"
      />

      <AsignarProductosModal
        descuento={descuento}
        productos={productos}
        abierto={modalAbierto === "productos"}
        onCerrar={() => setModalAbierto(null)}
        acciones={ACCIONES_ASIGNACION_NEGOCIO}
        titulo="Productos de esta promoción"
        textoSinProductos="Primero agrega productos a tu catálogo para poder elegirlos aquí."
      />
    </article>
  );
}
