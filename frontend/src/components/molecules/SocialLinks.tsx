import { AtSign, Link2, MessageCircle } from "lucide-react";
import { IconLink } from "@/components/atoms/IconLink";
import { enlaceWhatsapp } from "@/lib/formato/whatsapp";

export interface PropsSocialLinks {
  whatsapp: string;
  instagramUsername: string | null;
  otraRedSocial: string | null;
  className?: string;
}

// whatsapp e instagram_username ya llegan saneados (reglas 2 y 3, backend: solo dígitos / solo
// username sin "@"), así que se arma el enlace directo. otra_red_social todavía no se sanea (es
// texto libre, regla 3): se muestra tal cual, sin intentar construir un enlace que podría no ser
// válido. No hay icono de marca para Instagram: lucide-react ya no incluye logos de terceros.
// WhatsApp lleva `enfasis` (naranja, CLAUDE.md sección 6 regla 2): es el único de los tres
// contactos con ese tratamiento.
export function SocialLinks({ whatsapp, instagramUsername, otraRedSocial, className = "" }: PropsSocialLinks) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`.trim()}>
      <li>
        <IconLink href={enlaceWhatsapp(whatsapp)} icono={<MessageCircle size={16} strokeWidth={1.5} />} enfasis>
          WhatsApp
        </IconLink>
      </li>
      {instagramUsername && (
        <li>
          <IconLink href={`https://instagram.com/${instagramUsername}`} icono={<AtSign size={16} strokeWidth={1.5} />}>
            @{instagramUsername}
          </IconLink>
        </li>
      )}
      {otraRedSocial && (
        <li className="inline-flex items-center gap-1.5 text-sm font-cuerpo text-texto-secundario">
          <Link2 size={16} strokeWidth={1.5} aria-hidden="true" />
          {otraRedSocial}
        </li>
      )}
    </ul>
  );
}
