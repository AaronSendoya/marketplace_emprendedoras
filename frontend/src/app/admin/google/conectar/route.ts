import { ErrorApi } from "@/lib/api/cliente";
import { obtenerUrlDeAutorizacionGoogle } from "@/lib/api/importaciones";
import { haySesion } from "@/lib/auth/sesion";
import { guardarInicioDeConexion } from "@/lib/google/cookies";
import { desafioPkce, esDireccionLocal, esUrlDeAutorizacionValida, valorAleatorio, type MotivoDeFallo } from "@/lib/google/oauth";

// Primer paso de «Conectar cuenta de Google» (reglas 17 y 22). Es una ruta (un enlace) y no una Server Function: la CSP
// (`form-action 'self'`) impide que un formulario termine en la pantalla de Google, y un GET con redirección sí puede.
//
// Genera el `state` y el verificador PKCE, los guarda en una cookie `httpOnly` de 10 minutos y manda al navegador a la dirección
// de autorización que arma el backend. El layout de /admin no cubre las rutas (`route.ts`), así que la sesión se comprueba aquí y
// que sea Admin lo impone el backend (403).
// `Location` relativo: detrás de un proxy, `request.url` puede traer el host interno y no el público.
const redirigir = (destino: string) => new Response(null, { status: 302, headers: { Location: destino, "Cache-Control": "no-store" } });
const alResultado = (motivo: MotivoDeFallo) => redirigir(`/conexion-google?estado=error&motivo=${motivo}`);

export async function GET() {
  if (!(await haySesion())) return alResultado("sin_sesion");

  const state = valorAleatorio();
  const verificador = valorAleatorio();
  try {
    const { url } = await obtenerUrlDeAutorizacionGoogle(state, await desafioPkce(verificador));
    // `localhost` solo se acepta en un computador de desarrollo (el backend también está en `localhost`).
    const permitirLocal = process.env.NODE_ENV !== "production" || esDireccionLocal(process.env.BACKEND_URL);
    if (!esUrlDeAutorizacionValida(url, permitirLocal)) return alResultado("no_disponible");
    await guardarInicioDeConexion(state, verificador);
    return redirigir(url);
  } catch (error) {
    if (error instanceof ErrorApi) {
      if (error.status === 401) return alResultado("sin_sesion");
      if (error.status === 403) return alResultado("sin_permiso");
      if (error.status === 409) return alResultado("no_configurado");
    }
    return alResultado("no_disponible");
  }
}
