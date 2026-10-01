"use server";

import { redirect } from "next/navigation";
import { iniciarSesion } from "@/lib/api/auth";
import { ErrorApi } from "@/lib/api/cliente";
import { cerrarCookieSesion, crearCookieSesion } from "@/lib/auth/sesion";

export interface EstadoLogin {
  error?: string;
}

// El freno del login es escalonado por correo (regla 17, backend): 15 s, 30 s, 1 min, 5 min y
// 10 min tope. "en 600 segundos" no se lee natural, así que se muestra en minutos a partir del
// minuto completo.
function formatearEspera(segundos: number): string {
  if (segundos < 60) return `${segundos} segundo${segundos === 1 ? "" : "s"}`;
  const minutos = Math.round(segundos / 60);
  return `${minutos} minuto${minutos === 1 ? "" : "s"}`;
}

// Mapea el error del backend a un mensaje en español sin revelar de más: la regla 5 exige el
// mismo error ante correo inexistente, contraseña incorrecta o cuenta desactivada, así que un 401
// en /auth/login siempre significa "credenciales incorrectas", no el 401 genérico de "falta
// token" que llevan otras rutas.
function mensajeDeError(error: ErrorApi): string {
  if (error.codigo === "DEMASIADAS_SOLICITUDES") {
    return error.retryAfter
      ? `Demasiados intentos. Intenta de nuevo en ${formatearEspera(error.retryAfter)}.`
      : "Demasiados intentos. Intenta de nuevo más tarde.";
  }
  if (error.status === 401) return "Correo o contraseña incorrectos.";
  if (error.status === 400) return "Revisa tu correo y tu contraseña.";
  return "No pudimos iniciar sesión. Intenta de nuevo.";
}

export async function iniciarSesionAction(_estadoPrevio: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Completa tu correo y tu contraseña." };
  }

  let respuesta;
  try {
    respuesta = await iniciarSesion(email, password);
  } catch (error) {
    return { error: error instanceof ErrorApi ? mensajeDeError(error) : "No pudimos iniciar sesión. Intenta de nuevo." };
  }

  await crearCookieSesion(respuesta.token, respuesta.usuario.rol);
  // El Admin tiene panel propio (fase 2, paso 2); la Emprendedora todavía no, así que sigue
  // yendo al catálogo público.
  redirect(respuesta.usuario.rol === "Admin" ? "/admin" : "/");
}

export async function cerrarSesionAction(): Promise<void> {
  await cerrarCookieSesion();
  redirect("/");
}
