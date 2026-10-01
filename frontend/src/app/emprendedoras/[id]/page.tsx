import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/Badge";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { SocialLinks } from "@/components/molecules/SocialLinks";
import { ErrorApi } from "@/lib/api/cliente";
import { obtenerPerfil } from "@/lib/api/perfiles";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

export default async function PaginaDetallePerfil({ params }: PageProps<"/emprendedoras/[id]">) {
  const { id } = await params;

  let perfil;
  try {
    perfil = await obtenerPerfil(id);
  } catch (error) {
    // Formato de id inválido (400, regla 17 backend) o perfil inexistente (404): mismo
    // not-found.tsx de esta ruta. Cualquier otro error (backend caído, 500...) sigue de largo
    // hacia error.tsx en vez de mostrarse como "no encontrado".
    if (error instanceof ErrorApi && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const fotoUsable = esUrlDeImagenUsable(perfil.foto_perfil_url);
  const logoUsable = esUrlDeImagenUsable(perfil.logo_url);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/emprendedoras"
        className={`font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`}
      >
        ← Volver a emprendedoras
      </Link>

      <article className="overflow-hidden rounded-lg border border-borde bg-superficie">
        <div className="relative aspect-[16/9] bg-borde">
          {fotoUsable ? (
            <Image
              src={perfil.foto_perfil_url}
              alt={perfil.nombre_negocio}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <MarcadorImagen etiqueta={perfil.nombre_negocio} className="h-full w-full" />
          )}

          <div className="absolute bottom-0 left-6 h-20 w-20 translate-y-1/2 overflow-hidden rounded-full border-2 border-superficie bg-superficie">
            {logoUsable ? (
              <Image src={perfil.logo_url} alt={`Logo de ${perfil.nombre_negocio}`} fill className="object-cover" />
            ) : (
              <MarcadorImagen etiqueta={`Logo de ${perfil.nombre_negocio}`} className="h-full w-full" />
            )}
          </div>
        </div>

        <div className="space-y-4 p-6 pt-14">
          <div>
            <h1 className="font-titulo text-2xl font-extrabold text-texto">{perfil.nombre_negocio}</h1>
            <p className="font-cuerpo text-sm text-texto-secundario">{perfil.emprendedora}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge>{perfil.ciudad.nombre}</Badge>
            <Badge>{perfil.rubro.nombre}</Badge>
          </div>

          <p className="font-cuerpo text-sm whitespace-pre-line text-texto-secundario">{perfil.descripcion}</p>

          <SocialLinks
            whatsapp={perfil.whatsapp}
            instagramUsername={perfil.instagram_username}
            otraRedSocial={perfil.otra_red_social}
          />
        </div>
      </article>
    </main>
  );
}
