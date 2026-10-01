import { ErrorValidacion } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { IPasswordHasher } from "../domain/IPasswordHasher";
import type { IOtpRepository } from "../domain/IOtpRepository";
import { MAX_INTENTOS_OTP, type PropositoOtp } from "../domain/Otp";

const MENSAJE_OTP_INVALIDO = "El código es incorrecto, venció o ya no tiene intentos. Solicita uno nuevo.";

// Un solo error para todo fallo (sin código, incorrecto, vencido, usado, sin intentos): no da
// pistas de cuál fue (regla 15).
export const errorOtpInvalido = () => new ErrorValidacion(MENSAJE_OTP_INVALIDO, [{ campo: "codigo", mensaje: MENSAJE_OTP_INVALIDO }]);

// Valida y consume el OTP (regla 15). Lo comparten el restablecimiento de contraseña, el cambio de
// correo y el alta de cuentas.
export class VerificadorOtp {
  constructor(
    private readonly otps: IOtpRepository,
    private readonly hasher: IPasswordHasher,
    private readonly clock: IClock,
  ) {}

  async consumir(email: string, proposito: PropositoOtp, codigo: string): Promise<void> {
    const ahora = this.clock.ahora();
    const otp = await this.otps.buscarUltimo(email, proposito);
    if (!otp) throw errorOtpInvalido();

    // El intento se reserva antes de comparar y cuenta también si el código es correcto: así
    // peticiones en paralelo no pueden probar más códigos que el máximo.
    if (!(await this.otps.reservarIntento(otp.id, ahora, MAX_INTENTOS_OTP))) throw errorOtpInvalido();
    if (!(await this.hasher.comparar(codigo, otp.codigoHash))) throw errorOtpInvalido();
    // Si otra petición con el mismo código lo consumió en medio, esta pierde.
    if (!(await this.otps.consumir(otp.id, ahora))) throw errorOtpInvalido();
  }
}
