import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { cache } from "react";
import { ImagenR2 } from "@/components/atoms/ImagenR2";
import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/Badge";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { Migas } from "@/components/molecules/Migas";
import { SocialLinks } from "@/components/molecules/SocialLinks";
import { ErrorApi } from "@/lib/api/cliente";
import { obtenerPerfil } from "@/lib/api/perfiles";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";
import { resumirTexto } from "@/lib/formato/resumen";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

// Detalle de una emprendedora (CLAUDE.md sección 6, regla 14): migas de pan, la portada con el logo superpuesto,
// su nombre y etiquetas con los contactos a la derecha, y debajo "Acerca del negocio" junto a un panel de
// contacto (WhatsApp, Instagram y otra red) que se queda a la vista al desplazarse en escritorio. La portada es
// lo primero y más grande que se ve (el LCP): lleva `priority` y ni ella ni su contenedor se animan (regla 6).
const cargarPerfil = cache(async (id: string) => {
  try {
    return await obtenerPerfil(id);
  } catch (error) {
    // Formato de id inválido (400, regla 17 backend) o perfil inexistente (404): mismo
    // not-found.tsx de esta ruta. Cualquier otro error (backend caído, 500...) sigue de largo
    // hacia error.tsx en vez de mostrarse como "no encontrado".
    if (error instanceof ErrorApi && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }
});

// Cada negocio tiene su propio título y descripción (la pestaña, el historial y quien comparte el enlace los muestran): sin esto todas
// las páginas de detalle se llamaban igual. El mismo `cargarPerfil` sirve a la página, así que no se pide dos veces.
export async function generateMetadata({ params }: PageProps<"/emprendedoras/[id]">): Promise<Metadata> {
  const { id } = await params;
  const perfil = await cargarPerfil(id);
  return { title: `${perfil.nombre_negocio} — Emprendedoras`, description: resumirTexto(perfil.descripcion) };
}

export default async function PaginaDetallePerfil({ params }: PageProps<"/emprendedoras/[id]">) {
  const { id } = await params;
  const perfil = await cargarPerfil(id);

  const fotoUsable = esUrlDeImagenUsable(perfil.foto_perfil_url);
  const logoUsable = esUrlDeImagenUsable(perfil.logo_url);

  return (
    <main className={`mx-auto w-full ${CONTENEDOR_PUBLICO} flex-1 px-4 pb-16 sm:px-6 lg:px-8`}>
      <Migas items={[{ etiqueta: "Emprendedoras", href: "/emprendedoras" }, { etiqueta: perfil.nombre_negocio }]} />

      <div className="space-y-6">
        <article className="rounded-superficie border border-borde bg-superficie shadow-tarjeta">
          <div className="relative aspect-[16/9] bg-borde sm:aspect-[21/7]">
            <div className="absolute inset-0 overflow-hidden rounded-t-superficie">
              {fotoUsable ? (
                <ImagenR2
                  src={perfil.foto_perfil_url}
                  alt={perfil.nombre_negocio}
                  fill
                  sizes="(min-width: 1344px) 1344px, 100vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <MarcadorImagen etiqueta={perfil.nombre_negocio} className="h-full w-full" />
              )}
            </div>

            <div className="absolute bottom-0 left-5 h-[5.5rem] w-[5.5rem] translate-y-1/2 overflow-hidden rounded-full border-4 border-superficie bg-superficie shadow-[0_2px_8px_rgb(28_25_23/0.2)] sm:left-8 sm:h-[6.5rem] sm:w-[6.5rem]">
              {logoUsable ? (
                <ImagenR2 src={perfil.logo_url} alt={`Logo de ${perfil.nombre_negocio}`} fill sizes="104px" className="object-cover" />
              ) : (
                <MarcadorImagen etiqueta={`Logo de ${perfil.nombre_negocio}`} className="h-full w-full" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5 px-5 pt-16 pb-6 sm:px-8 sm:pt-[4.5rem] md:flex-row md:items-start md:justify-between md:gap-8">
            <div className="min-w-0 space-y-3">
              <div>
                <h1 className="font-titulo text-2xl leading-tight font-extrabold tracking-tight break-words text-texto sm:text-[2rem]">{perfil.nombre_negocio}</h1>
                <p className="mt-1 font-cuerpo text-[0.9375rem] text-texto-secundario">{perfil.emprendedora}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variante="ciudad" icono={<MapPin size={13} strokeWidth={1.75} />}>
                  {perfil.ciudad.nombre}
                </Badge>
                <Badge variante="rubro">{perfil.rubro.nombre}</Badge>
              </div>
            </div>

            <SocialLinks
              perfilId={perfil.id}
              whatsapp={perfil.whatsapp}
              instagramUsername={perfil.instagram_username}
              otraRedSocial={perfil.otra_red_social}
              variante="encabezado"
              className="md:shrink-0"
            />
          </div>
        </article>

        {/* `grid-cols-1` (una columna `minmax(0, 1fr)`) y no la columna automática: con esta, un texto largo sin espacios (una dirección web, un nombre) ensanchaba la columna más que la pantalla en un teléfono. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <section className="animate-entrada rounded-superficie border border-borde bg-superficie p-6 shadow-tarjeta sm:p-7">
            <h2 className="font-titulo text-lg font-bold text-texto">Acerca del negocio</h2>
            <p className="mt-3 font-cuerpo text-[0.9375rem] leading-relaxed break-words whitespace-pre-line text-texto-secundario">{perfil.descripcion}</p>
          </section>

          <aside
            className="animate-entrada rounded-superficie border border-borde bg-superficie p-6 shadow-tarjeta max-[359px]:p-4 lg:sticky lg:top-24"
            style={{ animationDelay: "80ms" }}
          >
            <h2 className="mb-4 font-titulo text-lg font-bold text-texto">Contacto</h2>
            <SocialLinks
              perfilId={perfil.id}
              whatsapp={perfil.whatsapp}
              instagramUsername={perfil.instagram_username}
              otraRedSocial={perfil.otra_red_social}
              variante="contacto"
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
