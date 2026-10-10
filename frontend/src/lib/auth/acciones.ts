"use server";

import { redirect } from "next/navigation";
import { cerrarSesionEnServidor, iniciarSesion } from "@/lib/api/auth";
import { ErrorApi } from "@/lib/api/cliente";
import { cerrarCookieSesion, crearCookieSesion } from "@/lib/auth/sesion";
import { clasificarError } from "@/lib/errores/clasificar";
import { registrarErrorDelServidor } from "@/lib/errores/registro";

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
  // Sin conexión con el servidor, tiempo agotado o base de datos fuera de servicio: se dice qué pasa, no «intenta de nuevo» a secas.
  const clasificado = clasificarError(error);
  if (clasificado.categoria === "sin_conexion" || clasificado.categoria === "tiempo_agotado" || clasificado.categoria === "servicio_no_disponible") {
    return clasificado.mensaje;
  }
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
    // Un 401 es «credenciales incorrectas» (no un fallo del sistema) y no se registra; lo demás sí.
    if (!(error instanceof ErrorApi && (error.status === 401 || error.status === 400 || error.status === 429))) registrarErrorDelServidor("iniciarSesionAction", error);
    return { error: error instanceof ErrorApi ? mensajeDeError(error) : "No pudimos iniciar sesión. Intenta de nuevo." };
  }

  await crearCookieSesion(respuesta.token, respuesta.usuario.rol);
  // Cada rol entra a su panel: el Admin a /admin y la Emprendedora a /mi-negocio. Solo cambia el
  // destino; la autenticación y la cookie son las mismas.
  redirect(respuesta.usuario.rol === "Admin" ? "/admin" : "/mi-negocio");
}

// Regla 5 (backend): primero se cierra la sesión en el servidor, con el token todavía en la cookie, y después se borra la cookie.
// Si el servidor no responde o el token ya no valía, la cookie se borra igual: la persona queda fuera de este navegador, que es lo
// que pidió. El único caso en que el token sigue valiendo en el servidor es que el backend esté caído justo en ese momento, y
// entonces vale hasta que venza (4 horas en el Admin).
export async function cerrarSesionAction(): Promise<void> {
  try {
    await cerrarSesionEnServidor();
  } catch {
    // Sin sesión que cerrar (token vencido o ya cerrado) o backend caído: no impide cerrar la sesión en este navegador.
  }
  await cerrarCookieSesion();
  redirect("/");
}
