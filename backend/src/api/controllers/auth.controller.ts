import { ok, sinContenido } from "@/api/http/respuestas";
import type { CambiarEmailUseCase } from "@/core/auth/application/CambiarEmailUseCase";
import type { LoginUseCase } from "@/core/auth/application/LoginUseCase";
import type { LogoutUseCase } from "@/core/auth/application/LogoutUseCase";
import type { RequestOtpUseCase } from "@/core/auth/application/RequestOtpUseCase";
import type { ResetPasswordUseCase } from "@/core/auth/application/ResetPasswordUseCase";
import type { UsuarioAutenticado } from "@/core/auth/domain/Usuario";
import { serializarUsuario } from "./usuario.serializador";

export async function login(usecase: LoginUseCase, email: string, password: string): Promise<Response> {
  const { token, usuario } = await usecase.ejecutar(email, password);
  return ok({ token, usuario: serializarUsuario(usuario) });
}

// Regla 5: borra la sesión del token que hace la llamada (204). Ese token deja de valer al instante.
export async function logout(usecase: LogoutUseCase, usuarioId: string, sesionId: string): Promise<Response> {
  await usecase.ejecutar(usuarioId, sesionId);
  return sinContenido();
}

export function obtenerMe(usuario: UsuarioAutenticado): Response {
  return ok(serializarUsuario(usuario));
}

export async function solicitarCodigoPassword(usecase: RequestOtpUseCase, email: string): Promise<Response> {
  await usecase.ejecutar({ email, proposito: "restablecer_password" });
  // Mismo texto exista o no la cuenta (regla 15).
  return ok({ mensaje: "Si el correo tiene una cuenta activa, recibirás un código." });
}

export async function restablecerPassword(
  usecase: ResetPasswordUseCase,
  datos: { email: string; codigo: string; passwordNueva: string },
): Promise<Response> {
  await usecase.ejecutar(datos);
  return ok({ mensaje: "Contraseña actualizada. Inicia sesión con la nueva." });
}

export async function solicitarCodigoEmail(usecase: RequestOtpUseCase, emailNuevo: string): Promise<Response> {
  await usecase.ejecutar({ email: emailNuevo, proposito: "verificar_email" });
  return ok({ mensaje: "Enviamos un código al correo nuevo." });
}

export async function cambiarEmail(
  usecase: CambiarEmailUseCase,
  usuarioId: string,
  emailNuevo: string,
  codigo: string,
): Promise<Response> {
  return ok(serializarUsuario(await usecase.ejecutar(usuarioId, emailNuevo, codigo)));
}
