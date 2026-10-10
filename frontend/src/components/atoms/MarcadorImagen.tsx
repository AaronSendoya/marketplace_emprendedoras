import { ImageOff } from "lucide-react";
import type { CSSProperties } from "react";

interface PropsMarcadorImagen {
  // Qué imagen falta (para quien usa un lector de pantalla). Vacío: la imagen era decorativa (`alt=""`), así que el marcador también.
  etiqueta?: string;
  className?: string;
  style?: CSSProperties;
}

// El lugar de una imagen que no existe o no abre: un recuadro gris con un icono, nunca el icono de imagen rota del navegador.
export function MarcadorImagen({ etiqueta = "", className = "", style }: PropsMarcadorImagen) {
  const decorativo = etiqueta.trim() === "";
  return (
    <div
      {...(decorativo ? { "aria-hidden": true } : { role: "img", "aria-label": etiqueta })}
      style={style}
      className={`flex items-center justify-center bg-borde text-texto-secundario ${className}`.trim()}
    >
      <ImageOff size={24} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}
