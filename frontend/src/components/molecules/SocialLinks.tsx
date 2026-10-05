"use client";

import { AtSign, Link2, MessageCircle } from "lucide-react";
import { useTransition } from "react";
import { IconLink } from "@/components/atoms/IconLink";
import { registrarClicAction } from "@/lib/metricas/acciones";
import { enlaceWhatsapp } from "@/lib/formato/whatsapp";

export interface PropsSocialLinks {
  perfilId: string;
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
//
// "use client" (regla 19): cada enlace registra un clic anónimo antes de abrirse. Siguen siendo
// `target="_blank"` (IconLink, sin cambios), así que la pestaña actual nunca se recarga y el
// registro — fire-and-forget, sin esperar su resultado — no retrasa ni puede romper la apertura.
export function SocialLinks({ perfilId, whatsapp, instagramUsername, otraRedSocial, className = "" }: PropsSocialLinks) {
  const [, iniciarTransicion] = useTransition();

  function alHacerClic(tipo: "whatsapp" | "instagram") {
    iniciarTransicion(() => {
      registrarClicAction(perfilId, tipo);
    });
  }

  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`.trim()}>
      <li>
        <IconLink
          href={enlaceWhatsapp(whatsapp)}
          icono={<MessageCircle size={16} strokeWidth={1.5} />}
          enfasis
          onClick={() => alHacerClic("whatsapp")}
        >
          WhatsApp
        </IconLink>
      </li>
      {instagramUsername && (
        <li>
          <IconLink
            href={`https://instagram.com/${instagramUsername}`}
            icono={<AtSign size={16} strokeWidth={1.5} />}
            onClick={() => alHacerClic("instagram")}
          >
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
