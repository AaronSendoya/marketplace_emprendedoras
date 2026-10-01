import { ErrorValidacion } from "@/shared/domain/errors";

const error = (mensaje: string) => new ErrorValidacion(mensaje, [{ campo: "instagram", mensaje }]);

// Rutas de instagram.com que no son un perfil (enlaces a publicaciones, etc.).
const RUTAS_RESERVADAS = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct", "s"]);
// Letras, números, puntos y guiones bajos; hasta 30; sin puntos seguidos ni punto final.
const USUARIO_VALIDO = /^(?!.*\.\.)[a-z0-9._]{1,30}$/;

// Regla 3: acepta `@usuario`, `instagram.com/usuario` (con https, www, barra final o parámetros) o
// `usuario`, y guarda solo el usuario, sin `@` y en minúsculas (Instagram no distingue mayúsculas).
// Sin texto devuelve null (el Instagram es opcional).
export function normalizarInstagram(entrada: string | null | undefined): string | null {
  const texto = entrada?.trim();
  if (!texto) return null;

  let usuario = texto;
  if (/instagram\.com/i.test(texto)) {
    const ruta = /^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/([^?#]*)/i.exec(texto)?.[1];
    const primero = ruta?.split("/").find(Boolean);
    if (!primero || RUTAS_RESERVADAS.has(primero.toLowerCase())) throw error("El enlace no es de un perfil de Instagram.");
    usuario = primero;
  }

  usuario = usuario.replace(/^@/, "").toLowerCase();
  if (!USUARIO_VALIDO.test(usuario) || usuario.endsWith(".")) {
    throw error("El usuario de Instagram solo admite letras, números, puntos y guiones bajos (máximo 30).");
  }
  return usuario;
}
