import { ErrorValidacion } from "@/shared/domain/errors";

// Regla 17 (2026-10-09): el token de la cuenta de Google que conectó el Admin llega en esta cabecera, solo en las peticiones del
// importador. El JavaScript del navegador nunca lo ve: el servidor del frontend lo toma de una cookie `httpOnly` y lo reenvía.
export const CABECERA_TOKEN_DE_GOOGLE = "x-google-access-token";

// Lo que se acepta como token: los de Google son texto opaco (`ya29.…`) de caracteres de una dirección y de largo acotado. Lo que no
// calza ni se mira, y nunca se registra: el mensaje no incluye el valor recibido.
const FORMA_DE_TOKEN = /^[A-Za-z0-9._~+/=-]{20,2048}$/;

export function leerTokenDeGoogle(request: Request): string | null {
  const valor = request.headers.get(CABECERA_TOKEN_DE_GOOGLE)?.trim();
  if (!valor) return null;
  if (!FORMA_DE_TOKEN.test(valor)) {
    throw new ErrorValidacion("La conexión con Google no es válida. Vuelve a conectar la cuenta.", [
      { campo: "google", mensaje: "La conexión con Google no es válida." },
    ]);
  }
  return valor;
}
