"use client";

import { ImagenR2 } from "@/components/atoms/ImagenR2";
import { useState } from "react";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { ChipAmpliar } from "@/components/molecules/ChipAmpliar";
import { VisorImagenes, type ImagenVisor } from "@/components/organisms/VisorImagenes";
import { CLASES_FOCO_CONTROL } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

interface PropsPortadaEmprendedora {
  fotoUrl: string;
  logoUrl: string;
  nombre: string;
}

// La cabecera de la tarjeta de una emprendedora (CLAUDE.md sección 6, regla 14, puntos b y h): la foto de perfil, y encima
// el logo en un recuadro blanco que se superpone a su borde inferior, sin recortarlo (`object-contain`). Los dos son
// botones que abren el visor con la imagen completa: el único tramo de la tarjeta con estado, por eso es el único cliente.
// La foto de perfil y el logo siguen siendo dos archivos separados (regla 11 del backend); aquí solo se muestran juntos.
// Una imagen que no se puede mostrar (memoria://, sin R2) deja el marcador de siempre y no es un botón. `group` es la
// tarjeta (el acercamiento al pasar el cursor) y `group/foto` el botón de la foto.
export function PortadaEmprendedora({ fotoUrl, logoUrl, nombre }: PropsPortadaEmprendedora) {
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState(0);

  // Una imagen cuyo archivo no existe o no carga (un 404 del bucket) cae en el marcador, igual que una URL no usable.
  const [fotoFallo, setFotoFallo] = useState(false);
  const [logoFallo, setLogoFallo] = useState(false);
  const fotoUsable = esUrlDeImagenUsable(fotoUrl) && !fotoFallo;
  const logoUsable = esUrlDeImagenUsable(logoUrl) && !logoFallo;

  const imagenes: ImagenVisor[] = [];
  const posicionDeLaFoto = fotoUsable ? imagenes.push({ src: fotoUrl, alt: `Foto de ${nombre}`, etiqueta: "Foto de perfil" }) - 1 : -1;
  const posicionDelLogo = logoUsable ? imagenes.push({ src: logoUrl, alt: `Logo de ${nombre}`, etiqueta: "Logo" }) - 1 : -1;

  function abrir(posicion: number) {
    setIndice(posicion);
    setAbierto(true);
  }

  return (
    <>
      <div className="relative aspect-[16/9] bg-borde">
        {fotoUsable ? (
          <button
            type="button"
            onClick={() => abrir(posicionDeLaFoto)}
            aria-label={`Ampliar la foto de ${nombre}`}
            className={`group/foto absolute inset-0 cursor-zoom-in overflow-hidden ${CLASES_FOCO_CONTROL}`}
          >
            <ImagenR2
              src={fotoUrl}
              alt=""
              fill
              sizes="(min-width: 1180px) 440px, (min-width: 768px) 50vw, 100vw"
              onError={() => setFotoFallo(true)}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <ChipAmpliar />
          </button>
        ) : (
          <MarcadorImagen etiqueta={nombre} className="absolute inset-0" />
        )}

        <div className="absolute bottom-0 left-5 h-[4.75rem] w-[4.75rem] translate-y-1/2 overflow-hidden rounded-2xl border-[3px] border-superficie bg-superficie shadow-[0_2px_8px_rgb(28_25_23/0.2)] @min-[22rem]:h-[5.75rem] @min-[22rem]:w-[5.75rem] @min-[22rem]:rounded-[1.25rem]">
          {logoUsable ? (
            <button
              type="button"
              onClick={() => abrir(posicionDelLogo)}
              aria-label={`Ampliar el logo de ${nombre}`}
              className={`absolute inset-0 cursor-zoom-in transition-transform duration-150 hover:scale-105 motion-reduce:transition-none ${CLASES_FOCO_CONTROL}`}
            >
              <ImagenR2 src={logoUrl} alt="" fill sizes="92px" onError={() => setLogoFallo(true)} className="object-contain" />
            </button>
          ) : (
            <MarcadorImagen etiqueta={`Logo de ${nombre}`} className="h-full w-full" />
          )}
        </div>
      </div>

      {imagenes.length > 0 && <VisorImagenes titulo={nombre} imagenes={imagenes} indice={indice} abierto={abierto} onCerrar={() => setAbierto(false)} onCambiar={setIndice} />}
    </>
  );
}
