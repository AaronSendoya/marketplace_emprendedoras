import type { IEmailSender, MensajeCorreo } from "@/shared/domain/IEmailSender";
import type { ILogger } from "@/shared/domain/ILogger";
import type { IPasswordHasher } from "../domain/IPasswordHasher";
import type { Usuario } from "../domain/Usuario";

// Compara por igualdad de texto: prueba la lógica de los casos de uso, no bcrypt.
export const hasherFalso: IPasswordHasher = {
  hash: async (plano) => `hash-de-${plano}`,
  comparar: async (plano, hash) => hash === `hash-de-${plano}`,
};

export class CorreoFalso implements IEmailSender {
  readonly enviados: MensajeCorreo[] = [];
  falla = false;

  async enviar(mensaje: MensajeCorreo) {
    if (this.falla) throw new Error("smtp caído");
    this.enviados.push(mensaje);
  }

  // El código de 6 dígitos del último correo enviado.
  ultimoCodigo(): string {
    const codigo = /\b(\d{6})\b/.exec(this.enviados[this.enviados.length - 1]?.texto ?? "")?.[1];
    if (!codigo) throw new Error("no hay un correo con código");
    return codigo;
  }
}

export class LoggerFalso implements ILogger {
  readonly registros: { nivel: string; evento: string; datos?: Record<string, unknown> }[] = [];

  info(evento: string, datos?: Record<string, unknown>) {
    this.registros.push({ nivel: "info", evento, datos });
  }
  warn(evento: string, datos?: Record<string, unknown>) {
    this.registros.push({ nivel: "warn", evento, datos });
  }
  error(evento: string, datos?: Record<string, unknown>) {
    this.registros.push({ nivel: "error", evento, datos });
  }
}

export const usuarioDePrueba = (parches: Partial<Usuario> = {}): Usuario => ({
  id: "usuario-1",
  email: "aaron@gmail.com",
  nombres: "Aaron",
  apellidoPaterno: "Mamani",
  apellidoMaterno: null,
  passwordHash: "hash-de-ClaveVieja123",
  rol: "Emprendedor",
  activo: true,
  emailVerificadoEn: null,
  tokenVersion: 3,
  creadoEn: new Date("2026-01-01T00:00:00Z"),
  ...parches,
});
