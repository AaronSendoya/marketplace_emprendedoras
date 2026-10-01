// Regla 15: la contraseña nueva exige mínimo 8 caracteres; 72 bytes es el límite de bcrypt (más
// allá recorta en silencio, y dos contraseñas distintas valdrían lo mismo).
export const PASSWORD_MIN_CARACTERES = 8;
export const PASSWORD_MAX_BYTES = 72;

export const MENSAJE_POLITICA_PASSWORD = `La contraseña debe tener al menos ${PASSWORD_MIN_CARACTERES} caracteres y como máximo ${PASSWORD_MAX_BYTES} bytes.`;

export function cumplePoliticaPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_CARACTERES && new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES;
}
