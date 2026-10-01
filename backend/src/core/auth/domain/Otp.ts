export const PROPOSITOS_OTP = ["verificar_email", "restablecer_password"] as const;
export type PropositoOtp = (typeof PROPOSITOS_OTP)[number];

// Regla 15: parámetros iniciales, ajustables.
export const DIGITOS_CODIGO_OTP = 6;
export const VIGENCIA_OTP_MINUTOS = 10;
export const MAX_INTENTOS_OTP = 5;
export const LIMITE_SOLICITUDES_POR_MINUTO = 1;
export const LIMITE_SOLICITUDES_POR_HORA = 5;

export interface NuevoOtp {
  email: string;
  proposito: PropositoOtp;
  codigoHash: string;
  expiraEn: Date;
  creadoEn: Date;
}

export interface OtpCodigo extends NuevoOtp {
  id: string;
  intentos: number;
  usadoEn: Date | null;
}
