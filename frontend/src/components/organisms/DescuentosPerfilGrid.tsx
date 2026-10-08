"use client";

import { Percent } from "lucide-react";
import { ImagenR2 } from "@/components/atoms/ImagenR2";
import { useState, type ReactNode } from "react";
import { Badge, type VarianteBadge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { DescuentoFormularioModal } from "@/components/organisms/DescuentoFormularioModal";
import { ETIQUETA_FILTRO_ESTADO } from "@/components/organisms/FiltroEstadoDescuento";
import { MenuAccionesDescuento } from "@/components/organisms/MenuAccionesDescuento";
import type { Descuento, EstadoDescuento, ProductoPropio } from "@/lib/api/tipos";
import { formatearFechaLaPaz } from "@/lib/formato/fecha";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

interface PropsDescuentosPerfilGrid {
  perfilId: string;
  usuarioId: string;
  descuentos: Descuento[];
  productos: ProductoPropio[];
  // Filtro por estado activo (la lista ya viene filtrada del backend) y los botones que lo cambian,
  // armados por la página (Server Component): este grid solo los ubica y ajusta el estado vacío.
  estadoFiltro?: EstadoDescuento | null;
  // Si el emprendimiento tiene algún descuento, de cualquier estado: con la lista vacía, distingue "no hay
  // ninguno" (invita a crear el primero) de "no hay ninguno en este estado".
  hayDescuentos?: boolean;
  filtros?: ReactNode;
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

// Cuántos thumbnails de productos asignados se muestran antes de resumir el resto en "+N": un
// descuento con muchos productos no debería desarmar la tarjeta.
const TOPE_THUMBNAILS = 6;

// Grilla de tarjetas en vez de tabla: cada una muestra, de un vistazo, a qué productos aplica el
// descuento (thumbnails reales, no solo "3 productos" como texto) — el mismo problema que
// Productos, aplicado acá.
export function DescuentosPerfilGrid({
  perfilId,
  usuarioId,
  descuentos,
  productos,
  estadoFiltro = null,
  hayDescuentos = descuentos.length > 0,
  filtros,
}: PropsDescuentosPerfilGrid) {
  const [crearAbierto, setCrearAbierto] = useState(false);
  const productoPorId = new Map(productos.map((producto) => [producto.id, producto]));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h2 className="font-titulo text-base font-bold text-texto">Descuentos</h2>
        <Button onClick={() => setCrearAbierto(true)} className="w-full min-h-11 lg:min-h-0 sm:w-auto">
          Crear descuento
        </Button>
      </div>

      {/* Sin ningún descuento, de ningún estado, las opciones sobran: no hay nada que filtrar. */}
      {hayDescuentos && filtros}

      {descuentos.length === 0 && hayDescuentos && estadoFiltro ? (
        <div className="rounded-lg border border-borde bg-superficie p-4">
          <EstadoVacio
            icono={Percent}
            titulo={`No hay descuentos ${ETIQUETA_FILTRO_ESTADO[estadoFiltro].toLowerCase()}`}
            descripcion="Prueba con otro estado, o elige “Todos” para ver todos los descuentos de este emprendimiento."
          />
        </div>
      ) : descuentos.length === 0 ? (
        <div className="rounded-lg border border-borde bg-superficie p-4">
          <EstadoVacio
            icono={Percent}
            titulo="Sin descuentos"
            descripcion="Crea el primer descuento y asígnalo a los productos que quieras promocionar."
            accion={{ etiqueta: "Crear descuento", onClick: () => setCrearAbierto(true) }}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {descuentos.map((descuento) => {
            const productosAsignados = descuento.producto_ids
              .map((id) => productoPorId.get(id))
              .filter((producto): producto is ProductoPropio => producto !== undefined);
            const visibles = productosAsignados.slice(0, TOPE_THUMBNAILS);
            const restantes = productosAsignados.length - visibles.length;

            return (
              <div key={descuento.id} className="rounded-lg border border-borde bg-superficie p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-titulo text-2xl font-extrabold text-enfasis">{descuento.porcentaje}%</p>
                    <Badge variante={VARIANTE_POR_ESTADO[descuento.estado]} punto>
                      {ETIQUETA_POR_ESTADO[descuento.estado]}
                    </Badge>
                  </div>
                  <MenuAccionesDescuento descuento={descuento} productos={productos} usuarioId={usuarioId} />
                </div>

                {(descuento.fecha_inicio || descuento.fecha_fin) && (
                  <p className="mt-2 font-cuerpo text-xs text-texto-secundario">
                    {descuento.fecha_inicio && `Desde ${formatearFechaLaPaz(descuento.fecha_inicio, "siempre")}`}
                    {descuento.fecha_inicio && descuento.fecha_fin && " · "}
                    {descuento.fecha_fin && `Hasta ${formatearFechaLaPaz(descuento.fecha_fin, "siempre")}`}
                  </p>
                )}

                {/* Detalle (regla 8): completo, con sus saltos de línea; son 280 caracteres como máximo. */}
                {descuento.descripcion && <p className="mt-2 font-cuerpo text-sm break-words whitespace-pre-line text-texto">{descuento.descripcion}</p>}

                <div className="mt-3 border-t border-borde pt-3">
                  {productosAsignados.length === 0 ? (
                    <p className="font-cuerpo text-xs text-texto-secundario">Sin productos asignados.</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {visibles.map((producto) => {
                        const imagenUsable = esUrlDeImagenUsable(producto.imagen_url);
                        return (
                          <div
                            key={producto.id}
                            title={producto.nombre}
                            className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-borde bg-fondo"
                          >
                            {imagenUsable ? (
                              <ImagenR2 src={producto.imagen_url} alt={producto.nombre} fill sizes="32px" className="object-cover" />
                            ) : (
                              <MarcadorImagen etiqueta={producto.nombre} className="h-full w-full" />
                            )}
                          </div>
                        );
                      })}
                      {restantes > 0 && <span className="font-cuerpo text-xs text-texto-secundario">+{restantes}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DescuentoFormularioModal perfilId={perfilId} usuarioId={usuarioId} descuento={null} abierto={crearAbierto} onCerrar={() => setCrearAbierto(false)} />
    </div>
  );
}
