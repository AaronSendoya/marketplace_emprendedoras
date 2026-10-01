import { ErrorValidacion } from "@/shared/domain/errors";

const error = (mensaje: string) => new ErrorValidacion(mensaje, [{ campo: "whatsapp", mensaje }]);

// Regla 2: se guardan solo dígitos, con el código de país. Un número boliviano de 8 dígitos que
// empieza con 6 o 7 (celular) recibe el 591; con otro código de país se exige `+` o `00`.
export function normalizarWhatsapp(entrada: string): string {
  const texto = entrada.trim();
  if (!/^\+?[\d\s()\-.]+$/.test(texto)) throw error("El WhatsApp solo admite números, espacios, guiones y paréntesis.");

  let digitos = texto.replace(/\D/g, "");
  const conCodigoExplicito = texto.startsWith("+") || digitos.startsWith("00");
  if (digitos.startsWith("00")) digitos = digitos.slice(2);

  if (!conCodigoExplicito && /^[67]\d{7}$/.test(digitos)) digitos = `591${digitos}`;

  if (digitos.startsWith("591")) {
    if (!/^591[67]\d{7}$/.test(digitos)) throw error("Un WhatsApp de Bolivia tiene 8 dígitos y empieza con 6 o 7.");
    return digitos;
  }
  if (!conCodigoExplicito) throw error("Incluye el código de país, por ejemplo +591 71234567.");
  if (!/^[1-9]\d{7,14}$/.test(digitos)) throw error("El número de WhatsApp no es válido.");
  return digitos;
}
