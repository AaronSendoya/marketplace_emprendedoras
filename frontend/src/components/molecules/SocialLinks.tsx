"use client";

import { Globe, Link2 } from "lucide-react";
import { useTransition, type ReactNode } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { IconoFacebook, IconoInstagram, IconoTikTok, IconoWhatsApp } from "@/components/atoms/IconosRedes";
import { CLASES_FOCO_CONTROL } from "@/lib/estilos";
import { clasificarOtraRed, esWhatsappValido } from "@/lib/formato/redes";
import { enlaceWhatsapp } from "@/lib/formato/whatsapp";
import { registrarClicAction } from "@/lib/metricas/acciones";

export interface PropsSocialLinks {
  perfilId: string;
  whatsapp: string;
  instagramUsername: string | null;
  otraRedSocial: string | null;
  // Cómo se presentan los contactos (CLAUDE.md sección 6, regla 14, punto g):
  //  - "tarjeta": botones de icono de 44 px, uno por contacto que existe, para el pie de una tarjeta. Sin ningún
  //    contacto no devuelve nada, así que no queda ningún hueco reservado.
  //  - "encabezado": botones con texto, uno junto al otro, en la cabecera de un perfil.
  //  - "contacto": el panel de contacto de un perfil, a ancho completo.
  variante?: "tarjeta" | "encabezado" | "contacto";
  // Para el texto accesible de cada botón ("Instagram de Dulces de prueba").
  nombreNegocio?: string;
  className?: string;
}

type Clave = "whatsapp" | "instagram" | "tiktok" | "facebook" | "web";

interface Contacto {
  clave: Clave;
  href: string;
  // Nombre del servicio, para el texto accesible y la ayuda emergente.
  nombre: string;
  // Lo que dice un botón con texto.
  texto: string;
  // Lo que se cuenta al hacer clic (regla 19 del backend): solo WhatsApp e Instagram.
  clic: "whatsapp" | "instagram" | null;
}

// El color y el icono de cada servicio (regla 14, punto g): excepción funcional a la paleta, solo para su botón.
// Cadenas completas para que Tailwind las encuentre.
const FONDO_BOTON: Record<Clave, string> = {
  whatsapp: "bg-wa text-white",
  instagram: "text-white [background:var(--fondo-instagram)]",
  tiktok: "bg-tiktok text-white",
  facebook: "bg-facebook text-white",
  web: "bg-superficie text-texto shadow-[inset_0_0_0_1px_var(--color-borde-fuerte)]",
};

function Logo({ clave, className }: { clave: Clave; className: string }) {
  if (clave === "whatsapp") return <IconoWhatsApp className={className} />;
  if (clave === "instagram") return <IconoInstagram className={className} />;
  if (clave === "tiktok") return <IconoTikTok className={`${className} [filter:drop-shadow(1.2px_1.2px_0_#fe2c55)_drop-shadow(-1.2px_-1.2px_0_#25f4ee)]`} />;
  if (clave === "facebook") return <IconoFacebook className={className} />;
  return <Globe aria-hidden="true" strokeWidth={1.75} className={className} />;
}

// Solo se arma lo que se puede ejecutar: WhatsApp si el número es válido, Instagram si hay usuario, y TikTok, Facebook
// o un sitio web si «otra red social» es un enlace reconocible. Un texto que no lo es no genera botón.
function contactosDe({ whatsapp, instagramUsername, otraRedSocial }: Pick<PropsSocialLinks, "whatsapp" | "instagramUsername" | "otraRedSocial">): Contacto[] {
  const lista: Contacto[] = [];
  if (esWhatsappValido(whatsapp)) {
    lista.push({ clave: "whatsapp", href: enlaceWhatsapp(whatsapp), nombre: "WhatsApp", texto: "WhatsApp", clic: "whatsapp" });
  }
  if (instagramUsername) {
    lista.push({ clave: "instagram", href: `https://instagram.com/${instagramUsername}`, nombre: "Instagram", texto: `@${instagramUsername}`, clic: "instagram" });
  }
  const otra = clasificarOtraRed(otraRedSocial);
  if (otra) {
    const textos = { tiktok: "TikTok", facebook: "Facebook", web: "Sitio web" } as const;
    lista.push({ clave: otra.tipo, href: otra.href, nombre: textos[otra.tipo], texto: textos[otra.tipo], clic: null });
  }
  return lista;
}

// whatsapp e instagram_username ya llegan saneados (reglas 2 y 3, backend: solo dígitos / solo username sin "@"), así
// que se arma el enlace directo. otra_red_social es texto libre (regla 3): se reconoce por su enlace (`redes.ts`) y,
// si no es uno, solo se ve como texto en el panel de contacto del perfil.
//
// "use client" (regla 19): cada enlace de WhatsApp o Instagram registra un clic anónimo antes de abrirse. Siguen siendo
// `target="_blank"`, así que la pestaña actual nunca se recarga y el registro (fire-and-forget) no retrasa ni puede
// romper la apertura. Los de las demás redes no se cuentan: la API de métricas solo acepta esos dos.
export function SocialLinks({ perfilId, whatsapp, instagramUsername, otraRedSocial, variante = "tarjeta", nombreNegocio, className = "" }: PropsSocialLinks) {
  const [, iniciarTransicion] = useTransition();
  const contactos = contactosDe({ whatsapp, instagramUsername, otraRedSocial });

  function alHacerClic(tipo: Contacto["clic"]) {
    if (!tipo) return;
    iniciarTransicion(() => {
      registrarClicAction(perfilId, tipo);
    });
  }

  const enlace = (c: Contacto, clases: string, hijos: ReactNode, etiqueta?: string) => (
    <a
      key={c.clave}
      href={c.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={etiqueta}
      onClick={() => alHacerClic(c.clic)}
      className={clases}
    >
      {hijos}
    </a>
  );

  if (variante === "tarjeta") {
    if (contactos.length === 0) return null;
    const negocio = nombreNegocio ?? "este negocio";
    return (
      <div className={`flex shrink-0 gap-2 ${className}`.trim()}>
        {contactos.map((c) =>
          enlace(
            c,
            `group/red relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] transition-[translate,scale,filter] duration-150 hover:-translate-y-0.5 hover:scale-105 hover:brightness-105 motion-reduce:transition-none ${CLASES_FOCO_CONTROL} ${FONDO_BOTON[c.clave]}`,
            <>
              <Logo clave={c.clave} className="h-[22px] w-[22px]" />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-0 bottom-[calc(100%+0.5rem)] z-10 hidden rounded-md bg-texto px-2 py-1 font-cuerpo text-xs font-medium whitespace-nowrap text-white group-hover/red:block group-focus-visible/red:block"
              >
                {c.nombre}
              </span>
            </>,
            c.clave === "whatsapp" ? `Escribir por WhatsApp a ${negocio}` : `${c.nombre} de ${negocio}`,
          ),
        )}
      </div>
    );
  }

  // Con texto: WhatsApp es el botón verde; las demás redes, de contorno con el logo de la red en su recuadro.
  const boton = (c: Contacto, ancho: string, texto: string) =>
    enlace(
      c,
      c.clave === "whatsapp" ? clasesBoton("whatsapp", ancho, "grande") : clasesBoton("contorno", `min-w-0 ${ancho}`, "grande"),
      <>
        {c.clave === "whatsapp" ? (
          <IconoWhatsApp className="h-5 w-5 shrink-0" />
        ) : (
          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${FONDO_BOTON[c.clave]}`}>
            <Logo clave={c.clave} className="h-4 w-4" />
          </span>
        )}
        <span className="truncate">{texto}</span>
      </>,
    );

  if (variante === "encabezado") {
    if (contactos.length === 0) return null;
    return <div className={`flex flex-wrap gap-2.5 ${className}`.trim()}>{contactos.map((c) => boton(c, "max-sm:flex-1", c.texto))}</div>;
  }

  const textoLibre = otraRedSocial?.trim();
  const otraRedReconocida = contactos.some((c) => c.clave === "tiktok" || c.clave === "facebook" || c.clave === "web");
  if (contactos.length === 0 && !textoLibre) {
    return <p className={`font-cuerpo text-sm text-texto-secundario ${className}`.trim()}>Esta emprendedora aún no publicó medios de contacto.</p>;
  }

  return (
    <ul className={`grid gap-2.5 ${className}`.trim()}>
      {contactos.map((c) => {
        const texto = c.clave === "whatsapp" ? "Escribir por WhatsApp" : c.clave === "instagram" ? `Instagram ${c.texto}` : c.clave === "web" ? "Sitio web" : `Ver en ${c.texto}`;
        return <li key={c.clave}>{boton(c, "w-full", texto)}</li>;
      })}
      {textoLibre && !otraRedReconocida && (
        <li className="flex items-center gap-2 pt-1.5 font-cuerpo text-sm text-texto-secundario">
          <Link2 size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 break-words">{textoLibre}</span>
        </li>
      )}
    </ul>
  );
}
