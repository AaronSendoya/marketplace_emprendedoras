import { ErrorDemasiadasSolicitudes, ErrorNoAutenticado } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IIntentosLoginRepository } from "../domain/IIntentosLoginRepository";
import type { IPasswordHasher } from "../domain/IPasswordHasher";
import type { ITokenService } from "../domain/ITokenService";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import type { Usuario } from "../domain/Usuario";

// Regla 17: freno escalonado por correo. Cada tanda de intentos fallidos suma un escalón de
// espera (el siguiente intento se rechaza sin comparar la contraseña, evita el costo de CPU de
// bcrypt en un ataque); un inicio de sesión correcto reinicia el conteo. Valores iniciales,
// ajustables.
export const TAMANO_TANDA_INTENTOS = 5;
export const ESPERAS_SEGUNDOS = [15, 30, 60, 300, 600] as const; // 15 s, 30 s, 1 min, 5 min, 10 min (tope)

const MENSAJE_CREDENCIALES = "El correo o la contraseña son incorrectos.";

// Hash bcrypt (coste 12) de una contraseña que nunca se usa. Sin cuenta o con la cuenta inactiva
// se compara igual contra este hash fijo, para que el tiempo de respuesta no delate si el correo
// existe (mismo principio de la regla 15 aplicado al login).
const HASH_SIN_CUENTA = "$2b$12$OweHJ6ZecUtafrf6N5Xl/ueg7Qap9VyC8p4JkFrqaUZMoA25bicK2";

export interface ResultadoLogin {
  token: string;
  usuario: Usuario;
}

// Segundos que faltan del escalón activo, o 0 si no hay bloqueo. Solo hay bloqueo justo cuando
// `totalFallos` cae en un múltiplo exacto de la tanda: ese fallo fue el que lo completó, y los
// intentos siguientes se frenan hasta que pase su escalón, medido desde ese último fallo. Fuera de
// un múltiplo (p. ej. 6, 7, 8, 9) no hay bloqueo: se deja avanzar hasta completar la próxima tanda.
function segundosDeEspera(totalFallos: number, ultimoFallo: Date | null, ahora: Date): number {
  if (totalFallos === 0 || totalFallos % TAMANO_TANDA_INTENTOS !== 0 || !ultimoFallo) return 0;
  const escalon = Math.min(totalFallos / TAMANO_TANDA_INTENTOS - 1, ESPERAS_SEGUNDOS.length - 1);
  const desbloqueaEn = ultimoFallo.getTime() + ESPERAS_SEGUNDOS[escalon] * 1000;
  return Math.max(0, Math.ceil((desbloqueaEn - ahora.getTime()) / 1000));
}

export class LoginUseCase {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokens: ITokenService,
    private readonly intentos: IIntentosLoginRepository,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(email: string, password: string): Promise<ResultadoLogin> {
    const ahora = this.clock.ahora();
    const { totalFallos, ultimoFallo } = await this.intentos.estado(email);
    const espera = segundosDeEspera(totalFallos, ultimoFallo, ahora);

    if (espera > 0) {
      // Sin el correo: el registro no debe llevar datos personales (regla 17).
      this.logger.warn("login_bloqueado");
      throw new ErrorDemasiadasSolicitudes("Demasiados intentos fallidos con este correo. Intenta de nuevo más tarde.", espera);
    }

    const usuario = await this.usuarios.buscarPorEmail(email);
    const contrasenaValida = await this.hasher.comparar(password, usuario?.activo ? usuario.passwordHash : HASH_SIN_CUENTA);

    if (!usuario?.activo || !contrasenaValida) {
      await this.intentos.registrarFallo(email, ahora);
      this.logger.warn("login_fallido", usuario ? { usuarioId: usuario.id } : undefined);
      throw new ErrorNoAutenticado(MENSAJE_CREDENCIALES);
    }

    await this.intentos.limpiar(email);
    this.logger.info("login_exitoso", { usuarioId: usuario.id });
    const token = await this.tokens.emitir({ id: usuario.id, tokenVersion: usuario.tokenVersion, rol: usuario.rol });
    return { token, usuario };
  }
}
