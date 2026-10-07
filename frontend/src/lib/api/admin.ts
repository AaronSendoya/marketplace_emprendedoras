import { actualizarJsonAutenticado, eliminarJsonAutenticado, enviarJsonAutenticado, obtenerJsonAutenticado } from "./cliente";
import type { CuentaEliminada, FiltrosUsuarios, Pagina, Usuario, UsuarioCreado } from "./tipos";

// GET /admin/usuarios: todas las cuentas (Admin y Emprendedor), paginadas, las más recientes
// primero. Admite buscar por texto libre (nombres, apellidos y correo) y filtrar por estado
// (regla 5).
export const listarUsuarios = (filtros: FiltrosUsuarios = {}) =>
  obtenerJsonAutenticado<Pagina<Usuario>>("/admin/usuarios", { parametros: { ...filtros } });

// GET /admin/usuarios/{id}: datos básicos de una cuenta. Base del módulo "Emprendimientos" (la
// cabecera de /admin/emprendimientos/[usuarioId] necesita volver a pedirlos en cada carga de la
// página, a diferencia de la lista de Cuentas, que ya tiene el objeto completo en memoria).
export const obtenerUsuario = (id: string) => obtenerJsonAutenticado<Usuario>(`/admin/usuarios/${id}`);

export interface DatosNuevaCuenta {
  email: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  password?: string;
}

// POST /admin/usuarios: alta en un solo paso, sin OTP (regla 15). El rol siempre es Emprendedor
// (regla 5, backend); esta función nunca lo envía, ni falta que haga: el backend lo inyecta y
// rechaza el campo si llega. El correo queda sin verificar hasta el primer OTP que esa cuenta
// complete.
export const crearUsuario = (datos: DatosNuevaCuenta) => enviarJsonAutenticado<UsuarioCreado>("/admin/usuarios", datos);

// PATCH /admin/usuarios/{id}/estado: activar o desactivar (regla 5). 409 si el Admin intenta
// desactivarse a sí mismo — la UI ya evita mostrar el botón en esa fila, pero el backend lo
// impone igual.
export const cambiarEstadoUsuario = (id: string, activo: boolean) =>
  actualizarJsonAutenticado<Usuario>(`/admin/usuarios/${id}/estado`, { activo });

// Regla 5: elimina la cuenta por completo (solo una de Emprendedor activa). `confirmacionEmail` es el correo escrito por el Admin.
export const eliminarUsuario = (id: string, confirmacionEmail: string) =>
  eliminarJsonAutenticado<CuentaEliminada>(`/admin/usuarios/${id}`, { confirmacion_email: confirmacionEmail });

export interface DatosEditarCuenta {
  email?: string;
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string | null;
}

// PATCH /admin/usuarios/{id}: editar nombres, apellidos y correo, sin OTP (regla 5 y 15). Cambiar
// el correo lo deja sin verificar hasta el próximo OTP que la cuenta complete.
export const editarUsuario = (id: string, datos: DatosEditarCuenta) => actualizarJsonAutenticado<Usuario>(`/admin/usuarios/${id}`, datos);

// PATCH /admin/usuarios/{id}/password: el Admin restablece la contraseña de cualquier cuenta,
// sin OTP (regla 5 y 15) — el OTP es solo para que la propia Emprendedora se recupere.
export const restablecerPasswordAdmin = (id: string, password?: string) =>
  actualizarJsonAutenticado<UsuarioCreado>(`/admin/usuarios/${id}/password`, { password });
