import type { NuevoOtp, OtpCodigo, PropositoOtp } from "./Otp";

// No referencia a `usuarios`: el correo puede pertenecer a una cuenta que aún no existe.
export interface IOtpRepository {
  crear(otp: NuevoOtp): Promise<void>;
  // Solo el último código de cada correo y propósito vale: uno nuevo invalida los anteriores.
  buscarUltimo(email: string, proposito: PropositoOtp): Promise<OtpCodigo | null>;
  // Fechas de las solicitudes del correo desde `desde` (cualquier propósito), la más reciente primero.
  fechasSolicitudes(email: string, desde: Date): Promise<Date[]>;
  // Suma un intento de forma atómica. Devuelve false si el código ya se usó, venció o agotó sus
  // intentos: así varias peticiones en paralelo no superan el máximo.
  reservarIntento(id: string, ahora: Date, maxIntentos: number): Promise<boolean>;
  // Marca el código como usado. Devuelve false si otra petición ya lo consumió.
  consumir(id: string, ahora: Date): Promise<boolean>;
}
