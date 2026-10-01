import { randomInt } from "node:crypto";
import { DIGITOS_CODIGO_OTP } from "../domain/Otp";

// randomInt usa el generador criptográfico; padStart conserva los ceros a la izquierda.
export function generarCodigoOtp(): string {
  return randomInt(0, 10 ** DIGITOS_CODIGO_OTP).toString().padStart(DIGITOS_CODIGO_OTP, "0");
}
