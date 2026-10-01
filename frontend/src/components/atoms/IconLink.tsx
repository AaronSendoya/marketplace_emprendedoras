import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

interface PropsIconLink extends Omit<ComponentPropsWithoutRef<"a">, "href" | "children" | "target" | "rel"> {
  href: string;
  icono: ReactNode;
  children: ReactNode;
  // WhatsApp es naranja siempre, no solo al pasar el mouse (CLAUDE.md sección 6, regla 2: el
  // naranja es el color de WhatsApp en todo el sitio); Instagram y la tercera red social se
  // quedan en el tratamiento por defecto (magenta al hover).
  enfasis?: boolean;
}

// Icono solo cuando aporta significado (CLAUDE.md sección 6, regla 5): WhatsApp, Instagram y la
// tercera red social. Siempre es un enlace externo (wa.me, instagram.com...), nunca una ruta
// interna del sitio, por eso abre en pestaña nueva.
export function IconLink({ href, icono, children, enfasis = false, className = "", ...props }: PropsIconLink) {
  const clasesColor = enfasis
    ? "text-enfasis hover:text-enfasis-hover"
    : "text-texto-secundario hover:text-acento";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm font-cuerpo transition-colors ${clasesColor} ${CLASES_FOCO_ENLACE} ${className}`.trim()}
      {...props}
    >
      <span aria-hidden="true">{icono}</span>
      {children}
    </a>
  );
}
