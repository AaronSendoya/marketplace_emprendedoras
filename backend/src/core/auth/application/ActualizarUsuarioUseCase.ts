import { ErrorNoEncontrado } from "@/shared/domain/errors";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import type { CambiosUsuario, Usuario } from "../domain/Usuario";

// Regla 5: el Admin edita nombres, apellidos y correo de cualquier cuenta, sin OTP. Si cambia el
// correo, queda sin verificar (regla 15: nadie demostró controlarlo) hasta el primer OTP que esa
// cuenta complete — mismo criterio que el alta.
export class ActualizarUsuarioUseCase {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(adminId: string, usuarioId: string, cambios: CambiosUsuario): Promise<Usuario> {
    const actual = await this.usuarios.buscarPorId(usuarioId);
    if (!actual) throw new ErrorNoEncontrado("La cuenta no existe.");

    const correoCambia = cambios.email !== undefined && cambios.email !== actual.email;
    // Si otra petición ya usó ese correo en medio, el índice único responde ErrorConflicto.
    await this.usuarios.actualizar(usuarioId, { ...cambios, emailVerificadoEn: correoCambia ? null : undefined });
    this.logger.info("cuenta_editada", { usuarioId, adminId });

    const actualizado = await this.usuarios.buscarPorId(usuarioId);
    if (!actualizado) throw new Error("La cuenta editada no se encontró.");
    return actualizado;
  }
}
