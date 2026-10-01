import { ErrorConflicto, ErrorValidacion } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IPasswordHasher } from "../domain/IPasswordHasher";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import { cumplePoliticaPassword, MENSAJE_POLITICA_PASSWORD } from "../domain/Password";
import type { Usuario } from "../domain/Usuario";

export interface DatosNuevaCuenta {
  email: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  // Si falta, el sistema genera una contraseña temporal (regla 5).
  password?: string;
}

export interface ResultadoCreacion {
  usuario: Usuario;
  // Solo cuando la generó el sistema: se devuelve esta única vez, nunca se guarda en claro.
  passwordTemporal: string | null;
}

const MENSAJE_CORREO_EN_USO = "Ya existe una cuenta con ese correo.";

// Regla 5: solo un Admin llega aquí (lo exige requireAdmin en la ruta) y el rol siempre es
// Emprendedor; la petición no puede indicar otro. Regla 15: el alta ya no pide OTP (el código es
// solo para recuperar contraseña); el correo queda sin verificar hasta el primer OTP que complete
// esa cuenta, igual que las cuentas migradas del Excel (regla 12).
export class CreateUsuarioUseCase {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly hasher: IPasswordHasher,
    private readonly clock: IClock,
    private readonly logger: ILogger,
    private readonly generarPassword: () => string,
  ) {}

  async ejecutar(adminId: string, datos: DatosNuevaCuenta): Promise<ResultadoCreacion> {
    if (datos.password !== undefined && !cumplePoliticaPassword(datos.password)) {
      throw new ErrorValidacion(MENSAJE_POLITICA_PASSWORD, [{ campo: "password", mensaje: MENSAJE_POLITICA_PASSWORD }]);
    }
    if (await this.usuarios.buscarPorEmail(datos.email)) {
      throw new ErrorConflicto(MENSAJE_CORREO_EN_USO, [{ campo: "email", mensaje: MENSAJE_CORREO_EN_USO }]);
    }

    const password = datos.password ?? this.generarPassword();
    const ahora = this.clock.ahora();
    // Si otra petición creó la cuenta en medio, el índice único responde ErrorConflicto.
    const usuario = await this.usuarios.crear({
      email: datos.email,
      nombres: datos.nombres,
      apellidoPaterno: datos.apellidoPaterno,
      apellidoMaterno: datos.apellidoMaterno,
      passwordHash: await this.hasher.hash(password),
      rol: "Emprendedor",
      emailVerificadoEn: null,
      creadoEn: ahora,
    });
    this.logger.info("cuenta_creada", { usuarioId: usuario.id, adminId });

    return { usuario, passwordTemporal: datos.password === undefined ? password : null };
  }
}
