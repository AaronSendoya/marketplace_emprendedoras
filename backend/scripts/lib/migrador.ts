import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Connection, RowDataPacket } from "mysql2/promise";

export interface Migracion {
  nombre: string;
  sql: string;
  checksum: string;
}

export interface RegistroAplicado {
  nombre: string;
  checksum: string;
}

const PATRON_NOMBRE = /^(\d{4})_[a-z0-9_]+\.sql$/;
// MySQL confirma solo cada sentencia de definición (CREATE, ALTER...) y el ejecutor no abre
// transacciones: una migración que las controle no haría lo que parece.
const CONTROL_DE_TRANSACCION = /^\s*(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION)\b/im;
// Bloqueo por nombre (GET_LOCK): impide que dos ejecuciones simultáneas apliquen la misma migración.
const NOMBRE_BLOQUEO = "catalogo_migraciones";
const ESPERA_BLOQUEO_SEGUNDOS = 30;

// Git en Windows puede convertir los saltos de línea; sin normalizar, el mismo archivo daría
// checksums distintos según la máquina y parecería "modificado".
export const normalizarSql = (contenido: string) =>
  contenido.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

export const calcularChecksum = (sql: string) => createHash("sha256").update(sql).digest("hex");

export function leerMigraciones(directorio: string): Migracion[] {
  const archivos = readdirSync(directorio)
    .filter((archivo) => archivo.endsWith(".sql"))
    .sort();

  return archivos.map((nombre, indice) => {
    const numero = PATRON_NOMBRE.exec(nombre)?.[1];
    if (numero === undefined) {
      throw new Error(`Nombre de migración inválido: ${nombre} (formato: NNNN_descripcion.sql).`);
    }
    if (Number(numero) !== indice + 1) {
      throw new Error(
        `La numeración debe ser consecutiva desde 0001: ${nombre} ocupa la posición ${indice + 1} (¿número repetido o faltante?).`,
      );
    }

    const sql = normalizarSql(readFileSync(join(directorio, nombre), "utf8"));
    if (CONTROL_DE_TRANSACCION.test(sql)) {
      throw new Error(
        `${nombre} no debe controlar la transacción (BEGIN/COMMIT/ROLLBACK): MySQL confirma cada sentencia de definición por su cuenta.`,
      );
    }
    return { nombre, sql, checksum: calcularChecksum(sql) };
  });
}

// Las migraciones aplicadas son inmutables y se aplican en orden: cualquier desvío se detiene
// antes de tocar la base.
export function verificarHistorial(aplicadas: RegistroAplicado[], migraciones: Migracion[]): void {
  const porNombre = new Map(migraciones.map((migracion) => [migracion.nombre, migracion]));

  for (const registro of aplicadas) {
    const migracion = porNombre.get(registro.nombre);
    if (!migracion) {
      throw new Error(`La migración ${registro.nombre} figura como aplicada en la base pero no existe en db/migrations.`);
    }
    if (migracion.checksum !== registro.checksum) {
      throw new Error(
        `La migración ${registro.nombre} ya se aplicó y luego se modificó. Las migraciones aplicadas son inmutables: crea una nueva en lugar de editarla.`,
      );
    }
  }

  // Sin nada aplicado no hay orden que comprobar (y slice(0, -1) descartaría solo la última).
  if (aplicadas.length === 0) return;

  const nombresAplicados = new Set(aplicadas.map((registro) => registro.nombre));
  const posicionUltimaAplicada = migraciones.reduce(
    (ultima, migracion, posicion) => (nombresAplicados.has(migracion.nombre) ? posicion : ultima),
    -1,
  );
  const hueco = migraciones.slice(0, posicionUltimaAplicada).find((m) => !nombresAplicados.has(m.nombre));
  if (hueco) {
    throw new Error(
      `La migración ${hueco.nombre} está pendiente, pero ya hay otras posteriores aplicadas. Renumérala como la siguiente de la serie.`,
    );
  }
}

// La conexión debe abrirse con `multiplesSentencias` (cada migración es un archivo con varias
// sentencias). Devuelve los nombres de las migraciones que aplicó (vacío si no había pendientes).
//
// MySQL no revierte el DDL: si una migración falla a la mitad, las sentencias anteriores quedan
// aplicadas. No se registra como aplicada y el error lo dice; al reintentar, las sentencias ya
// aplicadas deben poder repetirse (IF NOT EXISTS) o corregirse a mano.
export async function aplicarMigraciones(
  conexion: Connection,
  migraciones: Migracion[],
  alAplicar?: (nombre: string) => void,
): Promise<string[]> {
  const [bloqueo] = await conexion.query<RowDataPacket[]>("SELECT GET_LOCK(?, ?) AS obtenido", [
    NOMBRE_BLOQUEO,
    ESPERA_BLOQUEO_SEGUNDOS,
  ]);
  if (Number(bloqueo[0]?.obtenido) !== 1) {
    throw new Error("Otra ejecución de migraciones está en curso: espera a que termine e inténtalo de nuevo.");
  }
  try {
    await conexion.query(`
      CREATE TABLE IF NOT EXISTS _migraciones (
        nombre VARCHAR(100) NOT NULL,
        checksum CHAR(64) NOT NULL,
        aplicada_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const [filas] = await conexion.query<(RowDataPacket & RegistroAplicado)[]>(
      "SELECT nombre, checksum FROM _migraciones ORDER BY nombre",
    );
    const aplicadas = filas.map(({ nombre, checksum }) => ({ nombre, checksum }));
    verificarHistorial(aplicadas, migraciones);

    const yaAplicadas = new Set(aplicadas.map((fila) => fila.nombre));
    const pendientes = migraciones.filter((migracion) => !yaAplicadas.has(migracion.nombre));

    for (const migracion of pendientes) {
      try {
        await conexion.query(migracion.sql);
        await conexion.query("INSERT INTO _migraciones (nombre, checksum) VALUES (?, ?)", [
          migracion.nombre,
          migracion.checksum,
        ]);
      } catch (error) {
        const motivo = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Falló la migración ${migracion.nombre} y no se registró: ${motivo}. MySQL no revierte el DDL, así que puede haber quedado aplicada en parte: revisa el esquema y corrígelo antes de reintentar.`,
          { cause: error },
        );
      }
      alAplicar?.(migracion.nombre);
    }

    return pendientes.map((migracion) => migracion.nombre);
  } finally {
    // Si la conexión murió, el bloqueo ya se liberó con la sesión: no enmascarar el error original.
    await conexion.query("SELECT RELEASE_LOCK(?)", [NOMBRE_BLOQUEO]).catch(() => {});
  }
}
