import { ArrowRight, MapPin } from "lucide-react";
import { ImagenR2 } from "@/components/atoms/ImagenR2";
import Link from "next/link";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { BotonConsultarPrecio } from "@/components/molecules/BotonConsultarPrecio";
import { ImagenProducto } from "@/components/molecules/ImagenProducto";
import { PrecioProducto } from "@/components/molecules/PrecioProducto";
import { SocialLinks } from "@/components/molecules/SocialLinks";
import type { ProductoPublico } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";
import { esWhatsappValido } from "@/lib/formato/redes";

interface PropsProductoCard {
  producto: ProductoPublico;
  // Es un resultado parecido al texto buscado y no una coincidencia exacta (regla 21): lleva una línea naranja en el
  // borde inferior, la misma que explica `AvisoResultadosSimilares`.
  similar?: boolean;
}

// Card del Feed 2: una ficha comercial (CLAUDE.md sección 6, regla 14, punto b; rediseño del 2026-10-07). La imagen manda;
// debajo el nombre, quién lo vende, el rubro y la descripción, y un pie sobre fondo suave con el precio y la acción. La
// lógica de precio (normal / con descuento / «Consultar precio») ya llega resuelta del backend (reglas 7 y 8):
// `PrecioProducto` dibuja el precio y `BotonConsultarPrecio` el contacto. Con el precio visible: precio, «Ver producto» y el
// WhatsApp del negocio si existe. Con el precio oculto: «Ver producto» de contorno y «Consultar precio», este solo si hay
// WhatsApp: nunca un botón sin destino ni un hueco reservado. A diferencia de EmprendedoraCard, la imagen es una sola.
export function ProductoCard({ producto, similar = false }: PropsProductoCard) {
  const logoUsable = esUrlDeImagenUsable(producto.perfil.logo_url);
  const hrefProducto = `/productos/${producto.id}`;
  const hayWhatsapp = esWhatsappValido(producto.perfil.whatsapp);

  return (
    <article className="group @container flex h-full flex-col overflow-hidden rounded-superficie border border-borde bg-superficie shadow-tarjeta transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-borde-fuerte hover:shadow-tarjeta-hover motion-reduce:transition-none">
      <ImagenProducto src={producto.imagen_url} nombre={producto.nombre} negocio={producto.perfil.nombre_negocio}>
        {producto.porcentaje !== null && (
          <span className="pointer-events-none absolute top-3 left-3 rounded-lg bg-secundario px-2.5 py-2 font-titulo text-[0.9375rem] leading-none font-extrabold text-white">
            -{producto.porcentaje}%
          </span>
        )}
      </ImagenProducto>

      <div className="flex flex-1 flex-col gap-2.5 px-5 pt-[1.125rem] pb-4">
        <h2 className="font-titulo text-xl leading-tight font-extrabold tracking-tight text-texto @min-[22rem]:text-[1.3125rem]">
          <Link href={hrefProducto} className={`break-words hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE}`}>
            {producto.nombre}
            {similar && <span className="sr-only"> (resultado similar)</span>}
          </Link>
        </h2>

        <div className="flex min-w-0 items-center gap-2 font-cuerpo text-sm text-texto-secundario">
          {logoUsable ? (
            <span className="relative h-[1.875rem] w-[1.875rem] shrink-0 overflow-hidden rounded-lg border border-borde-fuerte bg-superficie">
              <ImagenR2 src={producto.perfil.logo_url} alt="" fill sizes="30px" className="object-contain" />
            </span>
          ) : (
            <Avatar nombreCompleto={producto.perfil.nombre_negocio} tamano="xs" />
          )}
          <Link
            href={`/emprendedoras/${producto.perfil.id}`}
            className={`min-w-0 truncate font-semibold text-texto hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE}`}
          >
            {producto.perfil.nombre_negocio}
          </Link>
          <span className="inline-flex shrink-0 items-center gap-1 text-stone-500">
            <MapPin size={13} strokeWidth={1.75} aria-hidden="true" />
            {producto.perfil.ciudad.nombre}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variante="rubro">{producto.perfil.rubro.nombre}</Badge>
        </div>

        {producto.descripcion && (
          <p className="line-clamp-3 font-cuerpo text-[0.9rem] leading-relaxed text-texto-secundario">{producto.descripcion}</p>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-3 border-t border-borde bg-stone-50 px-5 pt-3.5 pb-4">
        {producto.consultar_precio ? (
          <>
            <Link href={hrefProducto} className={clasesBoton("contorno", "min-w-0 flex-1", "tarjeta")}>
              Ver producto
            </Link>
            <BotonConsultarPrecio perfilId={producto.perfil.id} whatsapp={producto.perfil.whatsapp} className="min-w-0 flex-1" />
          </>
        ) : (
          <>
            <PrecioProducto
              precio={producto.precio}
              porcentaje={producto.porcentaje}
              precioConDescuento={producto.precio_con_descuento}
              className="basis-full @min-[24rem]:basis-0 @min-[24rem]:min-w-0 @min-[24rem]:flex-1"
            />
            <Link href={hrefProducto} className={clasesBoton("primario", "group/ver min-w-0 flex-1 @min-[24rem]:flex-none", "tarjeta")}>
              Ver producto
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="transition-transform duration-150 group-hover/ver:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            {hayWhatsapp && (
              <SocialLinks
                perfilId={producto.perfil.id}
                whatsapp={producto.perfil.whatsapp}
                instagramUsername={null}
                otraRedSocial={null}
                nombreNegocio={producto.perfil.nombre_negocio}
                variante="tarjeta"
              />
            )}
          </>
        )}
      </div>

      {similar && <span aria-hidden="true" className="h-[3px] shrink-0 bg-marca" />}
    </article>
  );
}
