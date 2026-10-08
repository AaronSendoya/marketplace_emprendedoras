import { ImagenR2 } from "@/components/atoms/ImagenR2";
import { Avatar } from "@/components/atoms/Avatar";
import { esUrlDeImagenUsable } from "@/lib/formato/imagen";

interface PropsLogoMiniNegocio {
  nombre: string;
  logoUrl: string;
  tamano?: "sm" | "md";
}

// El logo del negocio en un círculo pequeño (riel y cabecera móvil). Sin imagen usable —R2 sin
// conectar, o la imagen predeterminada— se muestran las iniciales del negocio: un ícono de "imagen
// rota" en la esquina de la pantalla se leería como un error.
export function LogoMiniNegocio({ nombre, logoUrl, tamano = "md" }: PropsLogoMiniNegocio) {
  if (!esUrlDeImagenUsable(logoUrl)) return <Avatar nombreCompleto={nombre} tamano={tamano} />;

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full border border-borde bg-superficie ${tamano === "md" ? "h-10 w-10" : "h-8 w-8"}`}
    >
      <ImagenR2 src={logoUrl} alt="" fill sizes="40px" className="object-cover" />
    </span>
  );
}
