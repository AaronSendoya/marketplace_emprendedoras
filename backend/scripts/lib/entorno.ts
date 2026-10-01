import { loadEnvConfig } from "@next/env";
import { parsearUrlMySql } from "../../src/shared/infrastructure/opcionesMySql";

// Carga los .env* con las mismas reglas de prioridad que Next (las variables ya definidas en la
// shell ganan sobre los archivos, así que `DATABASE_URL=... pnpm db:migrate` funciona).
export function cargarEntorno(): void {
  const previo = process.env.NODE_ENV;
  // @next/env no lee .env.local cuando NODE_ENV=test (Vitest lo fija), y ahí viven las cadenas
  // de conexión. Se fuerza el modo development solo durante la carga.
  Reflect.set(process.env, "NODE_ENV", "development");
  try {
    loadEnvConfig(process.cwd(), true);
  } finally {
    if (previo === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previo);
  }
}

export function variableObligatoria(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor) {
    throw new Error(`Falta la variable ${nombre}. Defínela en .env.local (referencia: .env.example).`);
  }
  return valor;
}

// Regla 13: el seed lleva una contraseña conocida, así que solo puede correr en desarrollo.
// APP_ENV no tiene valor por defecto: si falta, se niega en vez de asumir "development".
export function exigirDesarrollo(appEnv: string | undefined): void {
  if (appEnv !== "development") {
    throw new Error(
      `El seed de desarrollo solo corre con APP_ENV=development (valor actual: ${appEnv ?? "sin definir"}). Nunca se ejecuta en producción.`,
    );
  }
}

// Solo el host, para mostrar a qué base se apunta sin exponer usuario ni contraseña.
export function hostDe(cadenaConexion: string): string {
  return parsearUrlMySql(cadenaConexion).host;
}

// Host y base, para mostrar a qué se apunta (nunca usuario ni clave).
export function destinoDe(cadenaConexion: string): string {
  const { host, puerto, base } = parsearUrlMySql(cadenaConexion);
  return `${host}:${puerto}/${base}`;
}

// "localhost", "127.0.0.1" y "::1" son la misma máquina.
const esLocal = (host: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host.toLowerCase());

// Dos cadenas apuntan a la misma base si coinciden host, puerto y nombre de la base.
export function mismaBase(a: string, b: string): boolean {
  const x = parsearUrlMySql(a);
  const y = parsearUrlMySql(b);
  const mismoHost = x.host.toLowerCase() === y.host.toLowerCase() || (esLocal(x.host) && esLocal(y.host));
  return mismoHost && x.puerto === y.puerto && x.base.toLowerCase() === y.base.toLowerCase();
}
