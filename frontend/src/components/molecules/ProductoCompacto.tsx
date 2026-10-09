import { MapPin } from "lucide-react";
import Link from "next/link";
import { ImagenR2Segura } from "@/components/atoms/ImagenR2Segura";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import type { ProductoPublico } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";
import { formatearPorcentaje, formatearPrecio } from "@/lib/formato/precio";

interface PropsProductoCompacto {
  producto: ProductoPublico;
  // Es un resultado parecido al texto buscado y no una coincidencia exacta (regla 21): una línea naranja bajo la imagen.
  similar?: boolean;
}

// La tarjeta del mercado de Productos (CLAUDE.md sección 6, regla 14, punto l): la imagen cuadrada manda y todo lo demás cabe debajo en tres líneas:
// el precio, el nombre y el negocio con su ciudad. Es mucho más pequeña que `ProductoCard` para que se vean muchos a la vez, como en un
// mercado en línea. Una etiqueta púrpura «-10%» marca el descuento vigente, también cuando el precio está oculto o ausente (regla 8: entonces el
// precio dice «Consultar precio»). Todo viene resuelto del backend (reglas 7 y 8). De servidor, sin estado.
export function ProductoCompacto({ producto, similar = false }: PropsProductoCompacto) {
  const href = `/productos/${producto.id}`;
  const imagenUsable = esUrlDeImagenUsable(producto.imagen_url);

  return (
    <article className="group flex min-w-0 flex-col gap-2.5">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
        <span className="relative block aspect-square overflow-hidden rounded-xl bg-borde shadow-tarjeta transition-shadow duration-200 group-hover:shadow-tarjeta-hover">
          {imagenUsable ? (
            <ImagenR2Segura
              src={producto.imagen_url}
              alt=""
              fill
              sizes="(min-width: 1344px) 320px, (min-width: 1180px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
              fallback={<MarcadorImagen etiqueta={producto.nombre} className="absolute inset-0" />}
            />
          ) : (
            <MarcadorImagen etiqueta={producto.nombre} className="absolute inset-0" />
          )}
          {producto.porcentaje !== null && (
            <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-lg bg-secundario px-2 py-1.5 font-titulo text-[0.8125rem] leading-none font-extrabold text-white tabular-nums sm:text-sm">
              -{formatearPorcentaje(producto.porcentaje)}
            </span>
          )}
          {similar && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-marca" />}
        </span>
      </Link>

      <div className="min-w-0 space-y-1">
        {producto.consultar_precio ? (
          <p className="font-cuerpo text-sm font-semibold text-texto-secundario">Consultar precio</p>
        ) : producto.precio !== null && producto.precio_con_descuento !== null ? (
          <p className="flex flex-wrap items-baseline gap-x-2 font-titulo leading-tight">
            <span className="text-lg font-extrabold text-texto tabular-nums sm:text-xl">{formatearPrecio(producto.precio_con_descuento)}</span>
            <span className="font-cuerpo text-[0.8125rem] font-normal text-texto-secundario tabular-nums line-through">{formatearPrecio(producto.precio)}</span>
          </p>
        ) : (
          producto.precio !== null && <p className="font-titulo text-lg leading-tight font-extrabold text-texto tabular-nums sm:text-xl">{formatearPrecio(producto.precio)}</p>
        )}

        <h3 className="line-clamp-2 font-titulo text-[0.9375rem] leading-snug font-bold text-texto">
          <Link href={href} className={`hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE}`}>
            {producto.nombre}
            {similar && <span className="sr-only"> (resultado similar)</span>}
          </Link>
        </h3>

        <p className="flex min-w-0 items-center gap-1 font-cuerpo text-[0.8125rem] text-texto-secundario">
          <MapPin size={13} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          <Link href={`/emprendedoras/${producto.perfil.id}`} className={`min-w-0 truncate hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE}`}>
            {producto.perfil.nombre_negocio}
          </Link>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{producto.perfil.ciudad.nombre}</span>
        </p>
      </div>
    </article>
  );
}
