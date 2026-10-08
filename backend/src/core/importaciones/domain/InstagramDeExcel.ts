import { normalizarInstagram } from "@/core/perfiles/domain/Instagram";
import { MAXIMO_OTRA_RED_SOCIAL } from "@/core/perfiles/domain/OtraRedSocial";
import { ErrorValidacion } from "@/shared/domain/errors";
import { normalizarTexto } from "@/shared/domain/BusquedaSimilar";

// Regla 22: la columna de Instagram del formulario trae de todo: `@usuario`, enlaces de Instagram, un usuario sin arroba,
// "No tengo", el enlace de Facebook o una página web. Aquí se decide qué es cada cosa; el usuario de Instagram se normaliza
// con la regla 3 y lo que no es Instagram va a "otra red social" (regla 3, máximo 50 caracteres).

export type ResultadoInstagram =
  | { tipo: "vacio" }
  | { tipo: "sin_instagram"; texto: string }
  | { tipo: "instagram"; usuario: string }
  | { tipo: "otra_red"; texto: string }
  | { tipo: "otra_red_larga"; texto: string }
  | { tipo: "irreconocible"; texto: string };

const SIN_INSTAGRAM_SUELTO = new Set(["no", "nose", "ninguno", "ninguna", "ningun", "sin", "na", "n/a", "-", "--", "x", "..."]);
const SIN_INSTAGRAM_FRASE = /^(no|nose|ninguno|ninguna|sin|aun no|todavia no)\b|\b(no tengo|no cuento|no tiene|no tenemos|no hay|sin instagram|aun no tiene|nose tiene)\b/;
const OTRA_RED = /(facebook\.com|fb\.com|fb\.me|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|linkedin\.com|wa\.me|linktr\.ee)|^(https?:\/\/|www\.)|\.com(\.[a-z]{2})?($|[/?#])/i;
const USUARIO_SIMPLE = /^@?[A-Za-z0-9._]+$/;

function comoInstagram(texto: string): ResultadoInstagram {
  try {
    const usuario = normalizarInstagram(texto);
    return usuario ? { tipo: "instagram", usuario } : { tipo: "vacio" };
  } catch (error) {
    if (error instanceof ErrorValidacion) return { tipo: "irreconocible", texto };
    throw error;
  }
}

export type ResultadoOtraRed =
  | { tipo: "vacio" }
  | { tipo: "sin_red" }
  | { tipo: "texto"; texto: string }
  | { tipo: "texto_largo"; texto: string };

const esSinRed = (normalizado: string) => SIN_INSTAGRAM_SUELTO.has(normalizado) || SIN_INSTAGRAM_FRASE.test(normalizado);

// La columna «Otra red social» (regla 3): texto libre de hasta 50 caracteres, sin saneamiento, salvo "no tengo" y similares, que
// cuentan como vacío. A diferencia de la de Instagram, aquí no se adivina de qué red es: se guarda lo que escribió.
export function clasificarOtraRed(entrada: string): ResultadoOtraRed {
  const texto = entrada.trim().replace(/\s+/g, " ");
  if (!texto) return { tipo: "vacio" };
  if (esSinRed(normalizarTexto(texto))) return { tipo: "sin_red" };
  return texto.length > MAXIMO_OTRA_RED_SOCIAL ? { tipo: "texto_largo", texto } : { tipo: "texto", texto };
}

export function clasificarInstagram(entrada: string): ResultadoInstagram {
  const texto = entrada.trim();
  if (!texto) return { tipo: "vacio" };

  if (/instagram\.com/i.test(texto)) return comoInstagram(texto);

  const normalizado = normalizarTexto(texto).replace(/\s+/g, " ");
  if (SIN_INSTAGRAM_SUELTO.has(normalizado)) return { tipo: "sin_instagram", texto };

  if (OTRA_RED.test(texto)) {
    return texto.length > MAXIMO_OTRA_RED_SOCIAL ? { tipo: "otra_red_larga", texto } : { tipo: "otra_red", texto };
  }

  if (USUARIO_SIMPLE.test(texto)) return comoInstagram(texto);
  if (SIN_INSTAGRAM_FRASE.test(normalizado)) return { tipo: "sin_instagram", texto };
  return { tipo: "irreconocible", texto };
}
