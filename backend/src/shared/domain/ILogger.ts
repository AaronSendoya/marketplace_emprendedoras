// Nunca registrar correos, contraseñas, tokens ni códigos OTP: el adaptador redacta lo que
// reconoce, pero la primera barrera es no pasarlos.
export interface ILogger {
  info(evento: string, datos?: Record<string, unknown>): void;
  warn(evento: string, datos?: Record<string, unknown>): void;
  error(evento: string, datos?: Record<string, unknown>): void;
}
