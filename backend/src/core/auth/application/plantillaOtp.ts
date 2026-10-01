import type { MensajeCorreo } from "@/shared/domain/IEmailSender";
import { VIGENCIA_OTP_MINUTOS, type PropositoOtp } from "../domain/Otp";

const MOTIVO: Record<PropositoOtp, { asunto: string; uso: string }> = {
  restablecer_password: { asunto: "Código para restablecer tu contraseña", uso: "restablecer tu contraseña" },
  verificar_email: { asunto: "Código para verificar tu correo", uso: "verificar tu correo" },
};

export function plantillaOtp(para: string, proposito: PropositoOtp, codigo: string): MensajeCorreo {
  const { asunto, uso } = MOTIVO[proposito];
  return {
    para,
    asunto,
    texto:
      `Tu código para ${uso} en el catálogo Track de Mujeres 2026 es: ${codigo}\n\n` +
      `Vence en ${VIGENCIA_OTP_MINUTOS} minutos y solo sirve una vez. Si no lo solicitaste, ignora este mensaje.`,
  };
}
