import { ErrorNoEncontrado } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import type { Usuario } from "../domain/Usuario";
import type { VerificadorOtp } from "./VerificadorOtp";

export class CambiarEmailUseCase {
  constructor(
    private readonly verificador: VerificadorOtp,
    private readonly usuarios: IUsuarioRepository,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  // El código se envió al correo nuevo (regla 15): confirmarlo demuestra que la persona lo controla.
  async ejecutar(usuarioId: string, emailNuevo: string, codigo: string): Promise<Usuario> {
    await this.verificador.consumir(emailNuevo, "verificar_email", codigo);
    // Lanza ErrorConflicto si otra cuenta ya usa ese correo.
    await this.usuarios.cambiarEmail(usuarioId, emailNuevo, this.clock.ahora());
    this.logger.info("email_cambiado", { usuarioId });

    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new ErrorNoEncontrado("La cuenta ya no existe.");
    return usuario;
  }
}
