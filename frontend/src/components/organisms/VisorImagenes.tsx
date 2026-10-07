"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { CLASES_FOCO_CONTROL } from "@/lib/estilos";

export interface ImagenVisor {
  src: string;
  alt: string;
  // Qué es: "Foto de perfil", "Logo", "Producto". Va bajo el título y en la miniatura.
  etiqueta: string;
}

interface PropsVisorImagenes {
  titulo: string;
  imagenes: readonly ImagenVisor[];
  indice: number;
  abierto: boolean;
  onCerrar: () => void;
  onCambiar: (indice: number) => void;
}

// Visor de la imagen completa (CLAUDE.md sección 6, regla 14, punto h): la foto, el logo o la imagen de un producto
// tal como están guardados, sin el recorte de la tarjeta. Es un `<dialog>` modal: el navegador atrapa el foco, cierra con
// Escape, devuelve el foco al botón que lo abrió y deja inerte el resto de la página. El `<img>` va sin pasar por
// `next/image` a propósito: el optimizador la volvería a comprimir, y aquí lo que se quiere ver es el archivo guardado
// (regla 16 del backend: no existe una versión más grande). `display` no se toca en el `<dialog>`: con una clase que lo
// fije, un diálogo cerrado dejaría de estar oculto.
export function VisorImagenes({ titulo, imagenes, indice, abierto, onCerrar, onCambiar }: PropsVisorImagenes) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (abierto && !elemento.open) elemento.showModal();
    if (!abierto && elemento.open) elemento.close();
  }, [abierto]);

  // La página de atrás no se desplaza mientras el visor está abierto.
  useEffect(() => {
    if (!abierto) return;
    const html = document.documentElement;
    const previo = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previo;
    };
  }, [abierto]);

  const actual = imagenes[indice];
  const varias = imagenes.length > 1;
  const ir = (paso: number) => onCambiar((indice + paso + imagenes.length) % imagenes.length);

  function alPresionarTecla(evento: KeyboardEvent<HTMLDialogElement>) {
    if (!varias) return;
    if (evento.key === "ArrowLeft") ir(-1);
    if (evento.key === "ArrowRight") ir(1);
  }

  // Tocar fuera de la imagen y de los controles cierra el visor.
  function alHacerClic(evento: MouseEvent<HTMLDialogElement>) {
    if (!(evento.target as HTMLElement).closest("[data-conservar]")) onCerrar();
  }

  const clasesControl = `flex shrink-0 items-center justify-center border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/25 ${CLASES_FOCO_CONTROL}`;

  return (
    <dialog
      ref={dialogo}
      aria-label={`Imagen de ${titulo}`}
      onClose={onCerrar}
      onClick={alHacerClic}
      onKeyDown={alPresionarTecla}
      className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-texto/90 p-0 text-white backdrop:bg-transparent"
    >
      {abierto && actual && (
        <div className="flex h-full animate-aparecer flex-col gap-3 p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0" data-conservar>
              <p className="truncate font-titulo text-lg leading-tight font-extrabold">{titulo}</p>
              <p className="font-cuerpo text-sm text-stone-300">{actual.etiqueta}</p>
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" data-conservar className={`h-11 w-11 rounded-xl ${clasesControl}`}>
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-4">
            {varias && (
              <button type="button" onClick={() => ir(-1)} aria-label="Imagen anterior" data-conservar className={`hidden h-12 w-12 rounded-full sm:flex ${clasesControl}`}>
                <ChevronLeft size={22} strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- el archivo guardado, sin pasar por el optimizador (ver arriba) */}
            <img
              src={actual.src}
              alt={actual.alt}
              data-conservar
              className="max-h-[calc(100dvh-12.5rem)] max-w-full min-w-0 rounded-lg bg-white object-contain shadow-modal"
            />
            {varias && (
              <button type="button" onClick={() => ir(1)} aria-label="Imagen siguiente" data-conservar className={`hidden h-12 w-12 rounded-full sm:flex ${clasesControl}`}>
                <ChevronRight size={22} strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}
          </div>

          {varias && (
            <div className="flex justify-center gap-2.5" data-conservar>
              {imagenes.map((imagen, posicion) => (
                <button
                  key={imagen.src}
                  type="button"
                  onClick={() => onCambiar(posicion)}
                  aria-pressed={posicion === indice}
                  aria-label={`Ver ${imagen.etiqueta.toLowerCase()}`}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 bg-white/10 p-1.5 font-cuerpo text-xs font-medium transition-colors ${CLASES_FOCO_CONTROL} ${
                    posicion === indice ? "border-marca text-white" : "border-transparent text-stone-300 hover:bg-white/20"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del mismo archivo guardado */}
                  <img src={imagen.src} alt="" className="h-12 w-16 rounded-md bg-white object-contain" />
                  {imagen.etiqueta}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
