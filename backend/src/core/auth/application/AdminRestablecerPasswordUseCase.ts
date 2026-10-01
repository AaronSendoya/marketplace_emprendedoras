import { ErrorNoEncontrado, ErrorValidacion } from "@/shared/domain/errors";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IPasswordHasher } from "../domain/IPasswordHasher";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import { cumplePoliticaPassword, MENSAJE_POLITICA_PASSWORD } from "../domain/Password";
import type { Usuario } from "../domain/Usuario";

export interface ResultadoRestablecerPasswordAdmin {
  usuario: Usuario;
  // Solo cuando la generó el sistema: se devuelve esta única vez, nunca se guarda en claro.
  passwordTemporal: string | null;
}

// Regla 5 y 15: el Admin cambia la contraseña de cualquier cuenta directamente, sin OTP — el OTP
// es solo para que la propia Emprendedora se recupere. Igual que el alta: si el Admin no define
// una, el sistema genera una temporal y se devuelve una sola vez.
export class AdminRestablecerPasswordUseCase {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly hasher: IPasswordHasher,
    private readonly logger: ILogger,
    private readonly generarPassword: () => string,
  ) {}

  async ejecutar(adminId: string, usuarioId: string, passwordElegida?: string): Promise<ResultadoRestablecerPasswordAdmin> {
    if (passwordElegida !== undefined && !cumplePoliticaPassword(passwordElegida)) {
      throw new ErrorValidacion(MENSAJE_POLITICA_PASSWORD, [{ campo: "password", mensaje: MENSAJE_POLITICA_PASSWORD }]);
    }
    const usuario = await this.usuarios.buscarPorId(usuarioId);
    if (!usuario) throw new ErrorNoEncontrado("La cuenta no existe.");

    const password = passwordElegida ?? this.generarPassword();
    await this.usuarios.cambiarPasswordAdmin(usuarioId, await this.hasher.hash(password));
    this.logger.info("password_restablecida_por_admin", { usuarioId, adminId });

    const actualizado = await this.usuarios.buscarPorId(usuarioId);
    if (!actualizado) throw new Error("La cuenta no se encontró tras restablecer la contraseña.");
    return { usuario: actualizado, passwordTemporal: passwordElegida === undefined ? password : null };
  }
}
