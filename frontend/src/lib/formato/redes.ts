// Qué contactos de una emprendedora se pueden ejecutar de verdad (CLAUDE.md sección 6, regla 14, punto g). Solo
// aparece un botón cuando hay un destino válido: nunca uno vacío, deshabilitado o sin enlace.

// El backend entrega el WhatsApp ya saneado: solo dígitos con código de país (regla 2). Un perfil de prueba puede tenerlo
// vacío. 8 a 15 dígitos es lo que admite el plan internacional de numeración (E.164: hasta 15).
export function esWhatsappValido(numero: string): boolean {
  return /^\d{8,15}$/.test(numero);
}

export type TipoOtraRed = "tiktok" | "facebook" | "web";

export interface OtraRed {
  tipo: TipoOtraRed;
  // Dirección ya normalizada, siempre http(s).
  href: string;
}

const ES_TIKTOK = /(^|\.)tiktok\.com$/;
const ES_FACEBOOK = /(^|\.)(facebook\.com|fb\.com|fb\.me)$/;
// Un texto sin "http(s)://" solo se toma por dirección web si lo parece sin lugar a dudas: empieza por "www." o termina
// en un dominio de uso común. Así «ana.perez» o «dulces.ana» (un usuario con punto) no se convierten en un enlace falso.
const DOMINIO_SIN_ESQUEMA = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;
const DOMINIO_COMUN = /\.(com|net|org|info|biz|shop|store|online|site|app|bo)(\.[a-z]{2})?([/?#]|$)/i;

// «Otra red social» es texto libre de hasta 50 caracteres (regla 3 del backend: todavía no se sanea). Se reconoce por el
// enlace: TikTok, Facebook o un sitio web. Todo lo demás (un «@usuario» suelto, «TikTok: @ana», un texto cualquiera)
// devuelve null y no genera botón: no se adivina a qué red pertenece.
export function clasificarOtraRed(texto: string | null | undefined): OtraRed | null {
  const limpio = texto?.trim();
  if (!limpio) return null;

  const conEsquema = /^https?:\/\//i.test(limpio);
  const pareceDireccion =
    conEsquema ||
    (DOMINIO_SIN_ESQUEMA.test(limpio) && (/^www\./i.test(limpio) || DOMINIO_COMUN.test(limpio) || ES_TIKTOK.test(limpio.split("/")[0].toLowerCase()) || ES_FACEBOOK.test(limpio.split("/")[0].toLowerCase())));
  if (!pareceDireccion) return null;

  let url: URL;
  try {
    url = new URL(conEsquema ? limpio : `https://${limpio}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  if (!host.includes(".")) return null;
  const tipo: TipoOtraRed = ES_TIKTOK.test(host) ? "tiktok" : ES_FACEBOOK.test(host) ? "facebook" : "web";
  return { tipo, href: url.toString() };
}
