import type { Connection } from "mysql2/promise";
import { abrirConexion } from "../../../scripts/lib/conexion";
import { cargarEntorno, mismaBase, variableObligatoria } from "../../../scripts/lib/entorno";
import { parsearUrlMySql } from "../../../src/shared/infrastructure/opcionesMySql";

// Las pruebas escriben datos: solo pueden apuntar a una base de pruebas. Si DATABASE_URL_TEST
// coincide con la base de desarrollo, o su nombre no contiene "test", se detiene antes de conectarse.
export function urlDePruebas(): string {
  cargarEntorno();
  const url = variableObligatoria("DATABASE_URL_TEST");

  const { base } = parsearUrlMySql(url);
  if (!/test/i.test(base)) {
    throw new Error(
      `El nombre de la base de pruebas ("${base}") debe contener "test". Las pruebas de integración borran y crean datos.`,
    );
  }

  const desarrollo = process.env.DATABASE_URL?.trim();
  if (desarrollo && mismaBase(desarrollo, url)) {
    throw new Error("DATABASE_URL_TEST apunta a la misma base que DATABASE_URL. Usa una base de pruebas aparte.");
  }
  return url;
}

export async function conectar(opciones: { multiplesSentencias?: boolean } = {}): Promise<Connection> {
  return abrirConexion(urlDePruebas(), opciones);
}
