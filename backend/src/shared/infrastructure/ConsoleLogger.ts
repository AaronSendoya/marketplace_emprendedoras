import type { ILogger } from "@/shared/domain/ILogger";
import { nombreRestriccion, sanearMensajeSql } from "./errorMySql";

const REDACTADO = "[REDACTADO]";
const PROFUNDIDAD_MAXIMA = 5;

// Coincide por subcadena: cubre password, password_hash, token_version, codigo_otp, etc.
// El OTP debe llamarse `otp` (no `codigo`, que es el código de error de dominio).
const CLAVE_SENSIBLE = /pass|contrase|secret|token|jwt|authorization|cookie|otp|hash|email|correo|whatsapp/i;

const BEARER = /\bBearer\s+[\w.~+/=-]+/gi;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

export function sanearTexto(texto: string): string {
  return texto.replace(BEARER, `Bearer ${REDACTADO}`).replace(JWT, "[JWT]").replace(EMAIL, "[EMAIL]");
}

function sanearError(error: Error) {
  const { code, codigo, constraint, errno } = error as {
    code?: unknown;
    codigo?: unknown;
    constraint?: unknown;
    errno?: unknown;
  };
  const claveError = code ?? codigo;
  // Un error de MySQL trae el dato del usuario en el mensaje (y en la primera línea de la pila).
  const limpiar = (texto: string) => sanearTexto(typeof errno === "number" ? sanearMensajeSql(texto) : texto);
  return {
    mensaje: limpiar(error.message),
    codigo: typeof claveError === "string" ? claveError : undefined,
    restriccion: typeof constraint === "string" ? constraint : nombreRestriccion(error),
    pila: error.stack ? limpiar(error.stack) : undefined,
  };
}

export function sanearDatos(valor: unknown, profundidad = 0): unknown {
  if (typeof valor === "string") return sanearTexto(valor);
  if (typeof valor === "bigint" || typeof valor === "symbol") return String(valor);
  if (typeof valor === "function") return "[función]";
  if (valor === null || typeof valor !== "object") return valor;
  if (valor instanceof Date) return valor.toISOString();
  if (valor instanceof Error) return sanearError(valor);
  if (profundidad >= PROFUNDIDAD_MAXIMA) return "[...]";
  if (Array.isArray(valor)) return valor.map((item) => sanearDatos(item, profundidad + 1));

  return Object.fromEntries(
    Object.entries(valor).map(([clave, item]) => [
      clave,
      CLAVE_SENSIBLE.test(clave) ? REDACTADO : sanearDatos(item, profundidad + 1),
    ]),
  );
}

type Nivel = "info" | "warn" | "error";
type Salida = (nivel: Nivel, linea: string) => void;

const salidaConsola: Salida = (nivel, linea) => console[nivel](linea);

// Una línea JSON por evento, apta para los logs del hosting.
export class ConsoleLogger implements ILogger {
  constructor(private readonly salida: Salida = salidaConsola) {}

  info(evento: string, datos?: Record<string, unknown>): void {
    this.escribir("info", evento, datos);
  }

  warn(evento: string, datos?: Record<string, unknown>): void {
    this.escribir("warn", evento, datos);
  }

  error(evento: string, datos?: Record<string, unknown>): void {
    this.escribir("error", evento, datos);
  }

  private escribir(nivel: Nivel, evento: string, datos?: Record<string, unknown>): void {
    const saneados = datos ? (sanearDatos(datos) as Record<string, unknown>) : {};
    this.salida(nivel, JSON.stringify({ ...saneados, nivel, evento, fecha: new Date().toISOString() }));
  }
}
