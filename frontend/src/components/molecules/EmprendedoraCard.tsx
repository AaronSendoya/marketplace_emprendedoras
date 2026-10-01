import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/atoms/Badge";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { SocialLinks } from "@/components/molecules/SocialLinks";
import type { Perfil } from "@/lib/api/tipos";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

interface PropsEmprendedoraCard {
  perfil: Perfil;
}

// Collage de perfil (CLAUDE.md sección 6, regla 9; composición en docs/PLAN_IMPLEMENTACION_FRONTEND.md
// sección 6.4): la foto ocupa toda la cabecera y el logo se superpone en un círculo sobre la
// esquina inferior izquierda. foto_perfil_url y logo_url siempre existen (NOT NULL, regla 11
// backend), así que el mismo patrón vale con las imágenes predeterminadas, sin caso especial.
export function EmprendedoraCard({ perfil }: PropsEmprendedoraCard) {
  const fotoUsable = esUrlDeImagenUsable(perfil.foto_perfil_url);
  const logoUsable = esUrlDeImagenUsable(perfil.logo_url);

  return (
    <article className="overflow-hidden rounded-lg border border-borde bg-superficie">
      <div className="relative aspect-[4/3] bg-borde">
        {fotoUsable ? (
          <Image
            src={perfil.foto_perfil_url}
            alt={perfil.nombre_negocio}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <MarcadorImagen etiqueta={perfil.nombre_negocio} className="h-full w-full" />
        )}

        <div className="absolute bottom-0 left-4 h-14 w-14 translate-y-1/2 overflow-hidden rounded-full border-2 border-superficie bg-superficie">
          {logoUsable ? (
            <Image src={perfil.logo_url} alt={`Logo de ${perfil.nombre_negocio}`} fill className="object-cover" />
          ) : (
            <MarcadorImagen etiqueta={`Logo de ${perfil.nombre_negocio}`} className="h-full w-full" />
          )}
        </div>
      </div>

      <div className="space-y-3 p-4 pt-10">
        <div>
          <h2 className="font-titulo text-lg font-bold text-texto">{perfil.nombre_negocio}</h2>
          <p className="font-cuerpo text-sm text-texto-secundario">{perfil.emprendedora}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>{perfil.ciudad.nombre}</Badge>
          <Badge>{perfil.rubro.nombre}</Badge>
        </div>

        <p className="line-clamp-2 font-cuerpo text-sm text-texto-secundario">{perfil.descripcion}</p>

        <SocialLinks
          whatsapp={perfil.whatsapp}
          instagramUsername={perfil.instagram_username}
          otraRedSocial={perfil.otra_red_social}
        />

        <Link
          href={`/emprendedoras/${perfil.id}`}
          className={`inline-block font-cuerpo text-sm font-medium text-acento transition-colors hover:text-acento-hover ${CLASES_FOCO_ENLACE}`}
        >
          Ver perfil
        </Link>
      </div>
    </article>
  );
}
