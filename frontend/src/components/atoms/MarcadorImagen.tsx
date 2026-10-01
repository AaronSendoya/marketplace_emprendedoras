import { ImageOff } from "lucide-react";

interface PropsMarcadorImagen {
  etiqueta: string;
  className?: string;
}


export function MarcadorImagen({ etiqueta, className = "" }: PropsMarcadorImagen) {
  return (
    <div
      role="img"
      aria-label={etiqueta}
      className={`flex items-center justify-center bg-borde text-texto-secundario ${className}`.trim()}
    >
      <ImageOff size={24} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}
