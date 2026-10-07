import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/atoms/Badge";
import { clasesBoton } from "@/components/atoms/Button";
import { PortadaEmprendedora } from "@/components/molecules/PortadaEmprendedora";
import { SocialLinks } from "@/components/molecules/SocialLinks";
import type { Perfil } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface PropsEmprendedoraCard {
  perfil: Perfil;
  // Es un resultado parecido al texto buscado y no una coincidencia exacta (regla 20): lleva una línea naranja en el
  // borde inferior, la misma que explica `AvisoResultadosSimilares`.
  similar?: boolean;
}

// Card de una emprendedora: la identidad del negocio (CLAUDE.md sección 6, regla 14, punto b; rediseño del 2026-10-07).
// Portada con la foto, el logo grande superpuesto y, a su lado, el nombre del emprendimiento como lo más importante; debajo,
// quién es, dónde está, su rubro y una descripción de hasta 3 líneas; al pie, «Ver perfil» y los contactos que existan
// (`SocialLinks` no dibuja nada de lo que no tiene dato, y «Ver perfil» ocupa el espacio que quede). La portada es el único
// tramo con estado (el visor de imágenes). `@container`: el logo y el pie se ajustan al ancho de la tarjeta y no al de
// la pantalla. `h-full` + `mt-auto` en el pie: las tarjetas de una fila miden lo mismo y sus botones quedan alineados.
export function EmprendedoraCard({ perfil, similar = false }: PropsEmprendedoraCard) {
  return (
    <article className="group @container flex h-full flex-col overflow-hidden rounded-superficie border border-borde bg-superficie shadow-tarjeta transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-borde-fuerte hover:shadow-tarjeta-hover motion-reduce:transition-none">
      <PortadaEmprendedora fotoUrl={perfil.foto_perfil_url} logoUrl={perfil.logo_url} nombre={perfil.nombre_negocio} />

      <div className="flex flex-1 flex-col gap-3 px-5 pt-3.5 pb-5">
        {/* A la altura del logo (que ocupa su mitad inferior), el nombre y la persona van a su derecha. */}
        <div className="min-h-[2.875rem] pl-[5.75rem] @min-[22rem]:pl-[6.75rem]">
          <h2 className="font-titulo text-[1.1875rem] leading-tight font-extrabold tracking-tight text-texto @min-[22rem]:text-xl">
            <Link href={`/emprendedoras/${perfil.id}`} className={`break-words hover:underline hover:underline-offset-4 ${CLASES_FOCO_ENLACE}`}>
              {perfil.nombre_negocio}
              {similar && <span className="sr-only"> (resultado similar)</span>}
            </Link>
          </h2>
          <p className="mt-0.5 font-cuerpo text-sm text-texto-secundario">Por {perfil.emprendedora}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variante="ciudad" icono={<MapPin size={13} strokeWidth={1.75} />}>
            {perfil.ciudad.nombre}
          </Badge>
          <Badge variante="rubro">{perfil.rubro.nombre}</Badge>
        </div>

        <p className="line-clamp-3 font-cuerpo text-[0.9rem] leading-relaxed text-texto-secundario">{perfil.descripcion}</p>
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-borde px-5 py-3.5">
        <Link href={`/emprendedoras/${perfil.id}`} className={clasesBoton("primario", "min-w-0 flex-1 group/ver", "tarjeta")}>
          Ver perfil
          <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="transition-transform duration-150 group-hover/ver:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
        <SocialLinks
          perfilId={perfil.id}
          whatsapp={perfil.whatsapp}
          instagramUsername={perfil.instagram_username}
          otraRedSocial={perfil.otra_red_social}
          nombreNegocio={perfil.nombre_negocio}
          variante="tarjeta"
        />
      </div>

      {similar && <span aria-hidden="true" className="h-[3px] shrink-0 bg-marca" />}
    </article>
  );
}
