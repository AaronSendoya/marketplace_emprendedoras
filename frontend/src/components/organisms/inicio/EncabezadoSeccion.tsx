import type { ReactNode } from "react";

// El color de la etiqueta pequeña de la sección: el del área (CLAUDE.md sección 6, regla 14, puntos k y l): magenta para las personas y los lugares,
// naranja para los productos y púrpura para las promociones. Cadenas completas para que Tailwind las encuentre.
const COLOR_DE_LA_ETIQUETA = { acento: "text-acento", enfasis: "text-enfasis", secundario: "text-secundario" } as const;

interface PropsEncabezadoSeccion {
  // El id del título, para que la sección lo use en `aria-labelledby`.
  id: string;
  // Una o dos palabras: de qué trata la sección (regla 14, punto k: cada sección responde una pregunta).
  eyebrow: string;
  titulo: string;
  bajada?: string;
  // El enlace o botón de la derecha (por ejemplo «Ver las 86 emprendedoras»).
  accion?: ReactNode;
  tono?: keyof typeof COLOR_DE_LA_ETIQUETA;
}

// El encabezado común de las secciones del Inicio: una etiqueta pequeña, el título, una bajada y, a la derecha, una acción.
// El título es un h2: el único h1 de la página es el del Hero.
export function EncabezadoSeccion({ id, eyebrow, titulo, bajada, accion, tono = "acento" }: PropsEncabezadoSeccion) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 sm:mb-10">
      <div className="max-w-2xl">
        <p className={`font-cuerpo text-xs font-semibold tracking-[0.12em] uppercase ${COLOR_DE_LA_ETIQUETA[tono]}`}>{eyebrow}</p>
        <h2 id={id} className="mt-2.5 font-titulo text-[1.625rem] leading-tight font-extrabold tracking-tight text-balance text-texto sm:text-[2rem]">
          {titulo}
        </h2>
        {bajada && <p className="mt-2.5 max-w-xl font-cuerpo text-base text-pretty text-texto-secundario">{bajada}</p>}
      </div>
      {accion}
    </div>
  );
}
