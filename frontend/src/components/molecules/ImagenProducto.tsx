"use client";

import { ImagenR2 } from "@/components/atoms/ImagenR2";
import { useState, type ReactNode } from "react";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { ChipAmpliar } from "@/components/molecules/ChipAmpliar";
import { VisorImagenes } from "@/components/organisms/VisorImagenes";
import { CLASES_FOCO_CONTROL } from "@/lib/estilos";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

interface PropsImagenProducto {
  src: string;
  nombre: string;
  // El negocio que lo vende, para el pie del visor.
  negocio: string;
  // Lo que va encima de la imagen (la etiqueta de descuento).
  children?: ReactNode;
}

// La imagen de la tarjeta de un producto (CLAUDE.md sección 6, regla 14, puntos b y h): 4:3 y un botón que abre el visor
// con la imagen completa, sin el recorte de la tarjeta. El producto tiene una sola imagen (no hay collage). Si no se puede
// mostrar (memoria://, sin R2) queda el marcador de siempre y no es un botón. `group` es la tarjeta y `group/foto` el botón.
export function ImagenProducto({ src, nombre, negocio, children }: PropsImagenProducto) {
  const [abierto, setAbierto] = useState(false);
  // Una imagen cuyo archivo no existe o no carga (un 404 del bucket) cae en el marcador, igual que una URL no usable.
  const [fallo, setFallo] = useState(false);
  const usable = esUrlDeImagenUsable(src) && !fallo;

  return (
    <div className="relative aspect-[4/3] bg-borde">
      {usable ? (
        <>
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-label={`Ampliar la imagen de ${nombre}`}
            className={`group/foto absolute inset-0 cursor-zoom-in overflow-hidden ${CLASES_FOCO_CONTROL}`}
          >
            <ImagenR2
              src={src}
              alt=""
              fill
              sizes="(min-width: 1180px) 440px, (min-width: 768px) 50vw, 100vw"
              onError={() => setFallo(true)}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <ChipAmpliar />
          </button>
          <VisorImagenes
            titulo={nombre}
            imagenes={[{ src, alt: nombre, etiqueta: `Producto de ${negocio}` }]}
            indice={0}
            abierto={abierto}
            onCerrar={() => setAbierto(false)}
            onCambiar={() => undefined}
          />
        </>
      ) : (
        <MarcadorImagen etiqueta={nombre} className="absolute inset-0" />
      )}
      {children}
    </div>
  );
}
