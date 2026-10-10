import type { ComponentProps, ReactNode } from "react";
import { ImagenR2 } from "@/components/atoms/ImagenR2";

type PropsImagenR2Segura = Omit<ComponentProps<typeof ImagenR2>, "fallback"> & {
  // Lo que se ve si el archivo no carga (un 404 del bucket): nunca el icono de imagen rota del navegador.
  fallback: ReactNode;
};

// `ImagenR2` con un `fallback` obligatorio, para las tarjetas que quieren decidir exactamente qué se ve en su lugar (su propio marcador, con
// su etiqueta). Desde 2026-10-10 `ImagenR2` ya resuelve el error por sí sola; esto solo vuelve explícito el `fallback`.
export function ImagenR2Segura({ fallback, ...props }: PropsImagenR2Segura) {
  return <ImagenR2 {...props} fallback={fallback} />;
}
