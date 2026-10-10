import "server-only";
import { cookies } from "next/headers";
import { desempaquetarInicio, empaquetarInicio } from "./oauth";

// Cookies de la conexión con Google (reglas 17 y 22). Todas son `httpOnly`: el JavaScript de la página nunca ve el token ni la
// cuenta; el servidor del frontend los lee y reenvía el token al backend en una cabecera. Nada de esto toca la base de datos.
//
// - `google_oauth`: el `state` y el verificador PKCE entre `conectar` y `callback`. Vive 10 minutos y se borra al usarla.
// - `google_drive`: el token de acceso de solo lectura, una hora como máximo (menos un minuto, para que la cookie desaparezca
//   antes de que Google lo rechace).
// - `google_cuenta`: el correo de la cuenta conectada, solo para mostrarlo.
export const COOKIE_INICIO_GOOGLE = "google_oauth";
export const COOKIE_TOKEN_GOOGLE = "google_drive";
export const COOKIE_CUENTA_GOOGLE = "google_cuenta";

const DIEZ_MINUTOS = 10 * 60;
const UNA_HORA = 60 * 60;
const MARGEN = 60;

const BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

// Solo desde una Route Handler o una Server Function: `cookies().set` lanza durante el render de un Server Component.
export async function guardarInicioDeConexion(state: string, verificador: string): Promise<void> {
  const almacen = await cookies();
  almacen.set(COOKIE_INICIO_GOOGLE, empaquetarInicio(state, verificador), { ...BASE, path: "/admin/google", maxAge: DIEZ_MINUTOS });
}

// Se lee y se borra: un `state` sirve para una sola vuelta de Google.
export async function consumirInicioDeConexion(): Promise<{ state: string; verificador: string } | null> {
  const almacen = await cookies();
  const valor = almacen.get(COOKIE_INICIO_GOOGLE)?.value;
  almacen.delete({ name: COOKIE_INICIO_GOOGLE, path: "/admin/google" });
  return desempaquetarInicio(valor);
}

export async function guardarConexionGoogle(token: string, cuenta: string | null, expiraEnSegundos: number): Promise<void> {
  const almacen = await cookies();
  const maxAge = Math.max(MARGEN, Math.min(Math.floor(expiraEnSegundos), UNA_HORA) - MARGEN);
  almacen.set(COOKIE_TOKEN_GOOGLE, token, { ...BASE, path: "/admin", maxAge });
  if (cuenta) almacen.set(COOKIE_CUENTA_GOOGLE, cuenta, { ...BASE, path: "/admin", maxAge });
  else almacen.delete({ name: COOKIE_CUENTA_GOOGLE, path: "/admin" });
}

export interface ConexionLeida {
  token: string;
  cuenta: string | null;
}

// `null` si no hay conexión (nunca se hizo, venció o se desconectó).
export async function leerConexionGoogle(): Promise<ConexionLeida | null> {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_TOKEN_GOOGLE)?.value;
  if (!token) return null;
  return { token, cuenta: almacen.get(COOKIE_CUENTA_GOOGLE)?.value ?? null };
}

export async function borrarConexionGoogle(): Promise<void> {
  const almacen = await cookies();
  almacen.delete({ name: COOKIE_TOKEN_GOOGLE, path: "/admin" });
  almacen.delete({ name: COOKIE_CUENTA_GOOGLE, path: "/admin" });
}
