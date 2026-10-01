"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cambiarEstadoUsuario,
  crearUsuario,
  type DatosNuevaCuenta,
  editarUsuario,
  restablecerPasswordAdmin,
} from "@/lib/api/admin";
import { ErrorApi } from "@/lib/api/cliente";

export interface CuentaCreada {
  nombreCompleto: string;
  email: string;
  passwordTemporal: string | null;
}

export interface EstadoCrearCuenta {
  error?: string;
  creada?: CuentaCreada;
}

// Alta en un solo paso (regla 15, backend): ya no pide OTP. El rol nunca se envía (regla 5,
// backend: siempre inyecta Emprendedor); el correo queda sin verificar hasta el primer OTP que
// esa cuenta complete.
export async function crearCuentaAction(
  _estadoPrevio: EstadoCrearCuenta,
  formData: FormData,
): Promise<EstadoCrearCuenta> {
  const email = String(formData.get("email") ?? "").trim();
  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidoPaterno = String(formData.get("apellido_paterno") ?? "").trim();
  const apellidoMaterno = String(formData.get("apellido_materno") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !nombres || !apellidoPaterno) {
    return { error: "Completa los campos obligatorios." };
  }

  const datos: DatosNuevaCuenta = { email, nombres, apellido_paterno: apellidoPaterno };
  if (apellidoMaterno) datos.apellido_materno = apellidoMaterno;
  if (password) datos.password = password;

  let respuesta;
  try {
    respuesta = await crearUsuario(datos);
  } catch (error) {
    if (error instanceof ErrorApi) {
      if (error.status === 409) return { error: "Ese correo ya tiene una cuenta." };
      if (error.status === 400) return { error: error.message };
    }
    return { error: "No pudimos crear la cuenta. Intenta de nuevo." };
  }

  revalidatePath("/admin");
  return {
    creada: {
      nombreCompleto: respuesta.usuario.nombre_completo,
      email: respuesta.usuario.email,
      passwordTemporal: respuesta.password_temporal,
    },
  };
}

// Activar/desactivar una cuenta desde la lista (regla 5). Se usa como <form action={...bind}>:
// sin JS, sin useActionState. Un error (ej. sesión vencida) vuelve a la misma URL con
// `?error=estado` para mostrar un aviso en la tabla, en vez de caer al error genérico de
// app/error.tsx; `volverA` ya trae la página, `q` y `estado` actuales (crearHref en page.tsx).
export async function cambiarEstadoAction(id: string, activo: boolean, volverA: string): Promise<void> {
  try {
    await cambiarEstadoUsuario(id, activo);
  } catch {
    const separador = volverA.includes("?") ? "&" : "?";
    redirect(`${volverA}${separador}error=estado`);
  }
  revalidatePath("/admin");
}

export interface EstadoEditarCuenta {
  error?: string;
  guardado?: boolean;
}

// Editar nombres, apellidos y correo de una cuenta, sin OTP (regla 5 y 15). Cambiar el correo la
// deja sin verificar hasta el próximo OTP que esa cuenta complete.
export async function editarCuentaAction(
  usuarioId: string,
  _estadoPrevio: EstadoEditarCuenta,
  formData: FormData,
): Promise<EstadoEditarCuenta> {
  const email = String(formData.get("email") ?? "").trim();
  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidoPaterno = String(formData.get("apellido_paterno") ?? "").trim();
  const apellidoMaterno = String(formData.get("apellido_materno") ?? "").trim();

  if (!email || !nombres || !apellidoPaterno) {
    return { error: "Completa el correo, los nombres y el apellido paterno." };
  }

  try {
    await editarUsuario(usuarioId, {
      email,
      nombres,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno || null,
    });
  } catch (error) {
    if (error instanceof ErrorApi) {
      if (error.status === 409) return { error: "Ese correo ya tiene otra cuenta." };
      if (error.status === 400) return { error: error.message };
    }
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  revalidatePath("/admin");
  return { guardado: true };
}

export interface EstadoRestablecerPassword {
  error?: string;
  resultado?: { passwordTemporal: string | null };
}

// El Admin restablece la contraseña de una cuenta directamente, sin OTP (regla 5 y 15: el OTP es
// solo para que la propia Emprendedora se recupere). Si deja el campo vacío, el sistema genera una
// temporal y la devuelve una sola vez.
export async function restablecerPasswordAction(
  usuarioId: string,
  _estadoPrevio: EstadoRestablecerPassword,
  formData: FormData,
): Promise<EstadoRestablecerPassword> {
  const password = String(formData.get("password") ?? "").trim();

  let respuesta;
  try {
    respuesta = await restablecerPasswordAdmin(usuarioId, password || undefined);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 400) return { error: error.message };
    return { error: "No pudimos restablecer la contraseña. Intenta de nuevo." };
  }

  revalidatePath("/admin");
  return { resultado: { passwordTemporal: respuesta.password_temporal } };
}
