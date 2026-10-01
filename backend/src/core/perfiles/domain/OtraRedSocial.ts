import { ErrorValidacion } from "@/shared/domain/errors";

export const MAXIMO_OTRA_RED_SOCIAL = 50;

// Tercera red social del perfil (regla 3): texto libre, opcional. Solo se recorta; sin texto es null.
export function normalizarOtraRedSocial(entrada: string | null | undefined): string | null {
  const texto = entrada?.trim();
  if (!texto) return null;
  if (texto.length > MAXIMO_OTRA_RED_SOCIAL) {
    const mensaje = `La otra red social admite hasta ${MAXIMO_OTRA_RED_SOCIAL} caracteres.`;
    throw new ErrorValidacion(mensaje, [{ campo: "otra_red_social", mensaje }]);
  }
  return texto;
}
