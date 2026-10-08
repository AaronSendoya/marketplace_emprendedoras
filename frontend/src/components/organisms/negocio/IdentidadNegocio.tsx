import { MapPin } from "lucide-react";
import { ImagenR2 } from "@/components/atoms/ImagenR2";
import type { ReactNode } from "react";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import type { Perfil } from "@/lib/api/tipos";
import { CLASES_TARJETA_NEGOCIO } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

interface PropsIdentidadNegocio {
  perfil: Perfil;
  // El inicio la usa como título de la pantalla (<h1>); en las demás, la pantalla ya tiene el suyo.
  nivelTitulo: "h1" | "h2";
  // Botón o enlace alineado a la derecha del nombre (en móvil, debajo).
  accion?: ReactNode;
  children?: ReactNode;
}

// La tarjeta que dice "este es mi negocio". Mismo collage que EmprendedoraCard en el catálogo
// público (CLAUDE.md sección 6, regla 9): la foto ocupa la cabecera y el logo se superpone en un
// círculo sobre la esquina inferior izquierda, aquí a mayor escala. foto_perfil_url y logo_url
// siempre existen (regla 11, backend), así que con las imágenes predeterminadas se arma igual.
export function IdentidadNegocio({ perfil, nivelTitulo: Titulo, accion, children }: PropsIdentidadNegocio) {
  const fotoUsable = esUrlDeImagenUsable(perfil.foto_perfil_url);
  const logoUsable = esUrlDeImagenUsable(perfil.logo_url);

  return (
    <section aria-labelledby="titulo-negocio" className={CLASES_TARJETA_NEGOCIO}>
      <div className="relative h-36 sm:h-52 lg:h-60">
        <div className="absolute inset-0 overflow-hidden rounded-t-xl bg-borde">
          {fotoUsable ? (
            <ImagenR2 src={perfil.foto_perfil_url} alt="" fill sizes="(min-width: 1280px) 960px, 100vw" className="object-cover" priority />
          ) : (
            <MarcadorImagen etiqueta={`Foto de ${perfil.nombre_negocio}`} className="h-full w-full" />
          )}
        </div>

        <div className="absolute bottom-0 left-4 h-[72px] w-[72px] translate-y-1/2 overflow-hidden rounded-full border-4 border-superficie bg-superficie sm:left-8 sm:h-24 sm:w-24">
          {logoUsable ? (
            <ImagenR2 src={perfil.logo_url} alt={`Logo de ${perfil.nombre_negocio}`} fill sizes="96px" className="object-cover" />
          ) : (
            <MarcadorImagen etiqueta={`Logo de ${perfil.nombre_negocio}`} className="h-full w-full" />
          )}
        </div>
      </div>

      <div className="px-4 pt-12 pb-5 sm:px-8 sm:pt-16 sm:pb-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Titulo id="titulo-negocio" className="font-titulo text-2xl font-extrabold tracking-tight text-texto sm:text-3xl">
              {perfil.nombre_negocio}
            </Titulo>
            <p className="mt-1 font-cuerpo text-sm text-texto-secundario sm:text-[15px]">por {perfil.emprendedora}</p>
            <p className="mt-2.5 flex items-center gap-1.5 font-cuerpo text-sm text-texto-secundario">
              <MapPin size={16} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
              {perfil.rubro.nombre} · {perfil.ciudad.nombre}
            </p>
          </div>
          {accion && <div className="shrink-0">{accion}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}
