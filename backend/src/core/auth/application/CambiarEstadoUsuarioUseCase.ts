import { ErrorConflicto, ErrorNoEncontrado } from "@/shared/domain/errors";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import type { Usuario } from "../domain/Usuario";

export class CambiarEstadoUsuarioUseCase {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly logger: ILogger,
  ) {}

  // Desactivar revoca el acceso en la siguiente petición (requireAuth mira `activo`, regla 5).
  async ejecutar(adminId: string, usuarioId: string, activo: boolean): Promise<Usuario> {
    // Regla 5: un Admin no puede desactivarse a sí mismo (quedaría sin acceso).
    if (usuarioId === adminId && !activo) throw new ErrorConflicto("No puedes desactivar tu propia cuenta.");

    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new ErrorNoEncontrado("La cuenta no existe.");
    if (usuario.activo === activo) return usuario;

    await this.usuarios.cambiarEstado(usuarioId, activo);
    this.logger.info("cuenta_estado_cambiado", { usuarioId, adminId, activo });
    return { ...usuario, activo };
  }
}
