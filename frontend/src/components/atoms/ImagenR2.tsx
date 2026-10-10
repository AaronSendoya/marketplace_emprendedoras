"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState, type ReactNode } from "react";
import { MarcadorImagen } from "@/components/atoms/MarcadorImagen";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

// Toda imagen que viene de Cloudflare R2 (foto de perfil, logo, imagen de un producto) se muestra con este componente y no con
// `next/image` a secas (CLAUDE.md regla 16, decidido el 2026-10-08). Va `unoptimized`: el navegador pide el archivo directamente
// a R2 y nada pasa por el optimizador de Next. Ya se guardan reducidas y en WebP (regla 16), y el optimizador guarda copias en
// el disco de este servidor que siguen sirviéndose aunque la imagen se borre de R2, lo que contradice que eliminar una cuenta
// borre todo (regla 5; comprobado: R2 daba 404 y el optimizador seguía respondiendo 200). Con `unoptimized`, `sizes` no se usa.
// Los logos y banners locales de PISTA8 sí pasan por `next/image`; una regla de ESLint impide importarlo en cualquier otro sitio.
//
// Control de errores (2026-10-10): una imagen que no abre (un 404 del bucket, una clave que apunta a nada, un corte de red) nunca deja
// el icono de imagen rota del navegador: en su lugar va `fallback` o, por defecto, el marcador gris con el `alt` como etiqueta. Es
// un error NO crítico: la pantalla sigue, solo esa imagen se reemplaza. Cubre también la imagen que ya había fallado antes de que la
// página se hidratara (React no recibe el evento `error` de esa): se revisa al montar si el navegador la dio por rota.
type PropsImagenR2 = Omit<ImageProps, "unoptimized" | "loader"> & {
  // Lo que se ve si la imagen no abre. Sin él, el marcador estándar.
  fallback?: ReactNode;
};

export function ImagenR2({ fallback, onError, ...props }: PropsImagenR2) {
  const { src, alt, fill, width, height, className } = props;
  const origen = typeof src === "string" ? src : null;
  // El `src` que falló: si el componente recibe otro, se vuelve a intentar sin reiniciar nada más.
  const [fallido, setFallido] = useState<string | null>(null);

  // `ref` del <img>: si el navegador ya la dio por terminada y sin ancho, falló antes de que React escuchara el evento.
  const revisarSiYaFallo = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && origen && img.complete && img.naturalWidth === 0 && img.currentSrc !== "") setFallido(origen);
    },
    [origen],
  );

  // Sin dirección usable (vacía, o un `memoria://…` de desarrollo que el navegador no puede abrir) o con una que ya falló: no hay
  // nada que intentar abrir. Se aceptan las del propio sitio (`/…`) y las locales del navegador (`blob:`, `data:`).
  const usable = origen === null || esUrlDeImagenUsable(origen) || origen.startsWith("/") || origen.startsWith("blob:") || origen.startsWith("data:");
  const sinImagen = origen !== null && (!usable || fallido === origen);
  if (sinImagen) return <>{fallback ?? marcador({ alt, fill, width, height, className })}</>;

  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- `alt` llega en `props`, igual que en `next/image`
    <Image
      {...props}
      ref={revisarSiYaFallo}
      unoptimized
      onError={(evento) => {
        if (origen) setFallido(origen);
        onError?.(evento);
      }}
    />
  );
}

function marcador({ alt, fill, width, height, className }: Pick<ImageProps, "alt" | "fill" | "width" | "height" | "className">) {
  // Con `fill`, quien la usa ya tiene un contenedor relativo con tamaño: el marcador lo cubre. Sin `fill`, toma el tamaño pedido y las
  // clases de forma (`h-10 w-10 rounded-full`) de la imagen.
  if (fill) return <MarcadorImagen etiqueta={alt} className="absolute inset-0 h-full w-full" />;
  const medidas = typeof width === "number" && typeof height === "number" ? { width, height } : undefined;
  return <MarcadorImagen etiqueta={alt} className={className ?? ""} style={medidas} />;
}
