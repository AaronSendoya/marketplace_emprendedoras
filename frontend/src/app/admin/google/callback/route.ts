import type { NextRequest } from "next/server";
import { ErrorApi } from "@/lib/api/cliente";
import { conectarGoogle } from "@/lib/api/importaciones";
import { consumirInicioDeConexion, guardarConexionGoogle } from "@/lib/google/cookies";
import { esCodigoDeGoogle, sonIguales, type MotivoDeFallo } from "@/lib/google/oauth";

// Segundo paso de «Conectar cuenta de Google» (reglas 17 y 22): a esta dirección vuelve Google (`GOOGLE_REDIRECT_URI`).
//
// Orden de las comprobaciones: primero el `state` contra la cookie de un solo uso (contra la falsificación de peticiones), después
// lo que Google dice (cancelación o error) y por último el código, que el backend cambia por el token usando el verificador PKCE
// guardado. El token va a una cookie `httpOnly` de una hora y nunca a la dirección: la respuesta es una redirección a una
// pantalla que solo recibe «ok» o un código de motivo.
const redirigir = (destino: string) => new Response(null, { status: 302, headers: { Location: destino, "Cache-Control": "no-store" } });
const alResultado = (motivo: MotivoDeFallo) => redirigir(`/conexion-google?estado=error&motivo=${motivo}`);

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const inicio = await consumirInicioDeConexion();
  const state = parametros.get("state");

  if (!inicio || !state || !sonIguales(state, inicio.state)) return alResultado("estado_invalido");

  const errorDeGoogle = parametros.get("error");
  if (errorDeGoogle) return alResultado(errorDeGoogle === "access_denied" ? "cancelado" : "denegado");

  const codigo = parametros.get("code");
  if (!esCodigoDeGoogle(codigo)) return alResultado("rechazado");

  try {
    const conexion = await conectarGoogle(codigo, inicio.verificador);
    await guardarConexionGoogle(conexion.access_token, conexion.cuenta, conexion.expira_en);
    return redirigir("/conexion-google?estado=ok");
  } catch (error) {
    if (error instanceof ErrorApi) {
      if (error.status === 400) return alResultado("rechazado");
      if (error.status === 401) return alResultado("sin_sesion");
      if (error.status === 403) return alResultado("sin_permiso");
      if (error.status === 409) return alResultado("no_configurado");
    }
    return alResultado("no_disponible");
  }
}
