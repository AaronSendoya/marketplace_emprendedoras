"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { ImagenR2 } from "@/components/atoms/ImagenR2";

type PropsImagenR2Segura = Omit<ComponentProps<typeof ImagenR2>, "onError"> & {
  // Lo que se ve si el archivo no carga (un 404 del bucket): nunca el icono de imagen rota del navegador.
  fallback: ReactNode;
};

// `ImagenR2` con una salida para la imagen que no abre: las tarjetas de servidor (PromocionCard, ProductoCompacto) no pueden escuchar
// `onError`, así que lo hace este pequeño tramo de cliente y, si falla, muestra el `fallback` que le pasan. Las tarjetas con estado
// (ImagenProducto, PortadaEmprendedora) ya lo resuelven por su cuenta.
export function ImagenR2Segura({ fallback, ...props }: PropsImagenR2Segura) {
  const [fallo, setFallo] = useState(false);
  if (fallo) return <>{fallback}</>;
  return <ImagenR2 {...props} onError={() => setFallo(true)} />;
}
