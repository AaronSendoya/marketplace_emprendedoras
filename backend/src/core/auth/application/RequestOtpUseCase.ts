import { ErrorDemasiadasSolicitudes } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { IEmailSender } from "@/shared/domain/IEmailSender";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IOtpRepository } from "../domain/IOtpRepository";
import type { IPasswordHasher } from "../domain/IPasswordHasher";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import {
  LIMITE_SOLICITUDES_POR_HORA,
  LIMITE_SOLICITUDES_POR_MINUTO,
  VIGENCIA_OTP_MINUTOS,
  type PropositoOtp,
} from "../domain/Otp";
import { plantillaOtp } from "./plantillaOtp";

const MINUTO_MS = 60_000;
const HORA_MS = 60 * MINUTO_MS;

// Segundos hasta que la solicitud más antigua de la ventana la deje bajo el límite (0 si ya lo está).
// `fechas` viene de la más reciente a la más antigua.
function esperaSegundos(fechas: Date[], limite: number, ventanaMs: number, ahora: Date): number {
  const dentro = fechas.filter((fecha) => ahora.getTime() - fecha.getTime() < ventanaMs);
  if (dentro.length < limite) return 0;
  return Math.ceil((dentro[limite - 1].getTime() + ventanaMs - ahora.getTime()) / 1000);
}

export class RequestOtpUseCase {
  constructor(
    private readonly otps: IOtpRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly hasher: IPasswordHasher,
    private readonly correo: IEmailSender,
    private readonly clock: IClock,
    private readonly logger: ILogger,
    private readonly generarCodigo: () => string,
  ) {}

  async ejecutar(solicitud: { email: string; proposito: PropositoOtp }): Promise<void> {
    const { email, proposito } = solicitud;
    const ahora = this.clock.ahora();
    await this.exigirLimites(email, ahora);

    // Se registra siempre, exista o no la cuenta: así los límites y el tiempo de respuesta son los
    // mismos (regla 15, sin enumeración de cuentas).
    const codigo = this.generarCodigo();
    await this.otps.crear({
      email,
      proposito,
      codigoHash: await this.hasher.hash(codigo),
      expiraEn: new Date(ahora.getTime() + VIGENCIA_OTP_MINUTOS * MINUTO_MS),
      creadoEn: ahora,
    });
    this.logger.info("otp_solicitado", { proposito });

    const mensaje = plantillaOtp(email, proposito, codigo);
    if (proposito === "verificar_email") {
      // Quien lo pide ya está autenticado (Admin o la propia cuenta): si el envío falla, debe saberlo.
      await this.correo.enviar(mensaje);
      return;
    }

    // Restablecer contraseña: solo Emprendedor y solo con la cuenta activa (regla 15: el Admin no
    // se recupera por OTP, su contraseña se cambia con una consulta directa, regla 14); sin esperar
    // el envío para que la demora del correo no delate si la cuenta existe o de qué rol es.
    const usuario = await this.usuarios.buscarPorEmail(email);
    if (usuario?.activo && usuario.rol === "Emprendedor") {
      void this.correo.enviar(mensaje).catch((error: unknown) => this.logger.error("otp_envio_fallido", { error }));
    }
  }

  private async exigirLimites(email: string, ahora: Date): Promise<void> {
    const fechas = await this.otps.fechasSolicitudes(email, new Date(ahora.getTime() - HORA_MS));
    const espera = Math.max(
      esperaSegundos(fechas, LIMITE_SOLICITUDES_POR_MINUTO, MINUTO_MS, ahora),
      esperaSegundos(fechas, LIMITE_SOLICITUDES_POR_HORA, HORA_MS, ahora),
    );
    if (espera > 0) {
      throw new ErrorDemasiadasSolicitudes("Pediste demasiados códigos. Intenta de nuevo más tarde.", espera);
    }
  }
}
