import { ErrorValidacion } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IPasswordHasher } from "../domain/IPasswordHasher";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import { cumplePoliticaPassword, MENSAJE_POLITICA_PASSWORD } from "../domain/Password";
import { errorOtpInvalido, type VerificadorOtp } from "./VerificadorOtp";

export class ResetPasswordUseCase {
  constructor(
    private readonly verificador: VerificadorOtp,
    private readonly usuarios: IUsuarioRepository,
    private readonly hasher: IPasswordHasher,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(datos: { email: string; codigo: string; passwordNueva: string }): Promise<void> {
    // Antes de consumir el código: una contraseña rechazada no debe gastar un intento.
    if (!cumplePoliticaPassword(datos.passwordNueva)) {
      throw new ErrorValidacion(MENSAJE_POLITICA_PASSWORD, [{ campo: "password_nueva", mensaje: MENSAJE_POLITICA_PASSWORD }]);
    }

    await this.verificador.consumir(datos.email, "restablecer_password", datos.codigo);

    // Un correo sin cuenta activa también registra solicitudes de código (regla 15); si alguien
    // acertara ese código, el error es el mismo que con un código malo.
    const usuario = await this.usuarios.buscarPorEmail(datos.email);
    if (!usuario?.activo) throw errorOtpInvalido();

    await this.usuarios.restablecerPassword(usuario.id, await this.hasher.hash(datos.passwordNueva), this.clock.ahora());
    this.logger.info("password_restablecida", { usuarioId: usuario.id });
  }
}
