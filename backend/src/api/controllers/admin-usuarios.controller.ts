import { creado, ok, paginado } from "@/api/http/respuestas";
import type { ActualizarUsuarioUseCase } from "@/core/auth/application/ActualizarUsuarioUseCase";
import type { AdminRestablecerPasswordUseCase } from "@/core/auth/application/AdminRestablecerPasswordUseCase";
import type { CambiarEstadoUsuarioUseCase } from "@/core/auth/application/CambiarEstadoUsuarioUseCase";
import type { CreateUsuarioUseCase, DatosNuevaCuenta } from "@/core/auth/application/CreateUsuarioUseCase";
import type { GetUsuarioUseCase } from "@/core/auth/application/GetUsuarioUseCase";
import type { ListUsuariosUseCase } from "@/core/auth/application/ListUsuariosUseCase";
import type { CambiosUsuario, FiltrosUsuarios } from "@/core/auth/domain/Usuario";
import type { ParametrosPagina } from "@/shared/domain/Paginacion";
import { serializarUsuario } from "./usuario.serializador";

export async function crearUsuario(usecase: CreateUsuarioUseCase, adminId: string, datos: DatosNuevaCuenta): Promise<Response> {
  const { usuario, passwordTemporal } = await usecase.ejecutar(adminId, datos);
  return creado({ usuario: serializarUsuario(usuario), password_temporal: passwordTemporal });
}

export async function listarUsuarios(usecase: ListUsuariosUseCase, filtros: FiltrosUsuarios, pagina: ParametrosPagina): Promise<Response> {
  const { datos, total } = await usecase.ejecutar(filtros, pagina);
  return paginado({ datos: datos.map(serializarUsuario), total }, pagina);
}

export async function obtenerUsuario(usecase: GetUsuarioUseCase, id: string): Promise<Response> {
  return ok(serializarUsuario(await usecase.ejecutar(id)));
}

export async function cambiarEstadoUsuario(
  usecase: CambiarEstadoUsuarioUseCase,
  adminId: string,
  usuarioId: string,
  activo: boolean,
): Promise<Response> {
  return ok(serializarUsuario(await usecase.ejecutar(adminId, usuarioId, activo)));
}

export async function actualizarUsuario(
  usecase: ActualizarUsuarioUseCase,
  adminId: string,
  usuarioId: string,
  cambios: CambiosUsuario,
): Promise<Response> {
  return ok(serializarUsuario(await usecase.ejecutar(adminId, usuarioId, cambios)));
}

export async function restablecerPasswordAdmin(
  usecase: AdminRestablecerPasswordUseCase,
  adminId: string,
  usuarioId: string,
  password: string | undefined,
): Promise<Response> {
  const { usuario, passwordTemporal } = await usecase.ejecutar(adminId, usuarioId, password);
  return ok({ usuario: serializarUsuario(usuario), password_temporal: passwordTemporal });
}
