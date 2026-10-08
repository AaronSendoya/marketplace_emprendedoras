"use client";

import { CircleAlert } from "lucide-react";
import { ImagenR2 } from "@/components/atoms/ImagenR2";
import { useActionState } from "react";
import { Button } from "@/components/atoms/Button";
import { EntradaArchivoImagen } from "@/components/atoms/EntradaArchivoImagen";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

interface EstadoCampoImagen {
  error?: string;
  guardado?: boolean;
}

interface PropsCampoImagen {
  titulo: string;
  urlActual: string;
  alt: string;
  accion: (estadoPrevio: EstadoCampoImagen, formData: FormData) => Promise<EstadoCampoImagen>;
  textoPredeterminada?: string;
}

const ESTADO_INICIAL: EstadoCampoImagen = {};

// Reemplaza una sola imagen a la vez (foto de perfil, logo o imagen de producto): cada una es su
// propia ruta en el backend (PUT .../foto-perfil, .../logo, .../imagen), independiente de los datos
// de texto del perfil o del producto. `textoPredeterminada` solo aplica a perfil (foto/logo tienen
// imagen predeterminada, regla 11 backend; un producto no).
export function CampoImagen({ titulo, urlActual, alt, accion, textoPredeterminada }: PropsCampoImagen) {
  const [estado, ejecutar, pendiente] = useActionState(accion, ESTADO_INICIAL);
  const usable = esUrlDeImagenUsable(urlActual);

  return (
    <div className="space-y-2">
      <p className="font-cuerpo text-sm font-medium text-texto">{titulo}</p>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-borde bg-fondo">
          {usable ? (
            <ImagenR2 src={urlActual} alt={alt} fill sizes="80px" className="object-cover" />
          ) : (
            <MarcadorImagen etiqueta={alt} className="h-full w-full" />
          )}
        </div>

        <form action={ejecutar} className="flex-1 space-y-2">
          <EntradaArchivoImagen name="archivo" accept="image/jpeg,image/png,image/webp" disabled={pendiente} />

          {textoPredeterminada && (
            <label className="flex items-center gap-2 font-cuerpo text-xs text-texto-secundario">
              <input type="checkbox" name="usar_predeterminada" value="true" disabled={pendiente} />
              {textoPredeterminada}
            </label>
          )}

          {estado.error && (
            <p role="alert" className="flex items-center gap-2 font-cuerpo text-xs text-texto">
              <CircleAlert size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-acento" />
              {estado.error}
            </p>
          )}

          <Button type="submit" variante="secundario" disabled={pendiente} className="min-h-11 lg:min-h-0">
            {pendiente ? "Subiendo…" : "Reemplazar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
