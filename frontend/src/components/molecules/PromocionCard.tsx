import { ArrowRight, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { ImagenR2 } from "@/components/atoms/ImagenR2";
import { ImagenR2Segura } from "@/components/atoms/ImagenR2Segura";
import type { PromocionPublica } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { formatearPorcentaje } from "@/lib/formato/precio";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";
import { describirVigencia } from "@/lib/formato/vigencia";

interface PropsPromocionCard {
  promocion: PromocionPublica;
}

const productos = (n: number) => (n === 1 ? "1 producto" : `${n} productos`);

// Una promoción: un descuento de una emprendedora (CLAUDE.md sección 6, regla 14, punto l; regla 23 del backend). Una tira con hasta
// tres de sus productos y el porcentaje encima, en púrpura, el color de los descuentos; debajo, el negocio con su ciudad, «Negocio da N%
// de descuento en M productos», el texto del descuento, hasta cuándo rige («termina en N días» solo si faltan 7 o menos) y el botón que lleva
// a sus productos. Todo lo que dice ya viene resuelto del backend (reglas 8 y 23): aquí no se calcula vigencia. De servidor, sin estado.
// `@container` y `h-full`: las tarjetas de una fila miden lo mismo y sus botones quedan alineados.
export function PromocionCard({ promocion }: PropsPromocionCard) {
  const href = `/promociones/${promocion.id}`;
  const imagenes = promocion.productos_muestra.filter(esUrlDeImagenUsable);
  const vigencia = describirVigencia(promocion.fecha_fin);
  const porcentaje = formatearPorcentaje(promocion.porcentaje);
  const logoUsable = esUrlDeImagenUsable(promocion.perfil.logo_url);
  const cuantos = productos(promocion.productos_total);

  return (
    <article className="group @container flex h-full flex-col overflow-hidden rounded-superficie border border-borde bg-superficie shadow-tarjeta transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-borde-fuerte hover:shadow-tarjeta-hover motion-reduce:transition-none">
      <div className="relative flex h-32 gap-0.5 bg-secundario-suave">
        {imagenes.length > 0 ? (
          imagenes.map((url, indice) => (
            <div key={indice} className="relative min-w-0 flex-1 overflow-hidden">
              <ImagenR2Segura
                src={url}
                alt=""
                fill
                sizes="(min-width: 1180px) 140px, 33vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] motion-reduce:transition-none"
                fallback={<div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-secundario-suave to-secundario-borde" />}
              />
            </div>
          ))
        ) : (
          <div aria-hidden="true" className="flex-1 bg-gradient-to-br from-secundario-suave to-secundario-borde" />
        )}
        <span className="absolute top-3 left-3 rounded-[0.625rem] bg-secundario px-3 py-2 text-white shadow-[0_2px_8px_rgb(28_25_23/0.25)]">
          <span className="block font-titulo text-[1.375rem] leading-none font-extrabold tabular-nums">-{porcentaje}</span>
          <span className="mt-1 block font-cuerpo text-[0.6875rem] leading-none font-bold tracking-[0.06em] uppercase opacity-90">Descuento</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {logoUsable ? (
            <span className="relative size-[2.375rem] shrink-0 overflow-hidden rounded-[0.625rem] border border-borde-fuerte bg-superficie">
              <ImagenR2 src={promocion.perfil.logo_url} alt="" fill sizes="38px" className="object-contain" />
            </span>
          ) : (
            <Avatar nombreCompleto={promocion.perfil.nombre_negocio} tamano="sm" />
          )}
          <div className="min-w-0">
            <Link
              href={`/emprendedoras/${promocion.perfil.id}`}
              className={`block truncate font-titulo text-[0.9375rem] leading-tight font-bold text-texto hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE}`}
            >
              {promocion.perfil.nombre_negocio}
            </Link>
            <span className="inline-flex items-center gap-1 font-cuerpo text-[0.8125rem] text-texto-secundario">
              <MapPin size={12} strokeWidth={1.75} aria-hidden="true" />
              {promocion.perfil.ciudad.nombre}
            </span>
          </div>
        </div>

        <h3 className="font-titulo text-lg leading-snug font-extrabold tracking-tight text-balance text-texto">
          <Link href={href} className={`hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE}`}>
            {promocion.perfil.nombre_negocio} da {porcentaje} de descuento en {cuantos}
          </Link>
        </h3>

        {promocion.descripcion && <p className="line-clamp-3 font-cuerpo text-[0.9rem] leading-relaxed text-texto-secundario">{promocion.descripcion}</p>}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-cuerpo text-xs font-semibold ${
              vigencia.urgente ? "border-secundario-borde bg-secundario-suave text-secundario" : "border-borde bg-fondo text-texto-secundario"
            }`}
          >
            <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
            {vigencia.aviso ? `${vigencia.texto} · ${vigencia.aviso}` : vigencia.texto}
          </span>
          <Badge variante="neutro">{promocion.perfil.rubro.nombre}</Badge>
        </div>
      </div>

      <div className="px-5 pt-1 pb-5">
        <Link href={href} className={clasesBoton("descuento", "group/ver w-full", "tarjeta")}>
          {promocion.productos_total === 1 ? "Ver el producto" : `Ver los ${promocion.productos_total} productos`}
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" className="transition-transform duration-150 group-hover/ver:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </div>
    </article>
  );
}
