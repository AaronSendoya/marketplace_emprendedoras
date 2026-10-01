import { createConnection, type Connection } from "mysql2/promise";
import { opcionesDeConexion, SQL_INICIO_SESION } from "../../src/shared/infrastructure/opcionesMySql";

interface OpcionesConexion {
  // Solo migraciones y seed: el resto del código nunca acepta varias sentencias por consulta.
  multiplesSentencias?: boolean;
}

const ER_UNKNOWN_SYSTEM_VARIABLE = 1193;

// TiDB rechaza por defecto una consulta con varias sentencias (una migración completa es una),
// salvo que la sesión lo habilite explícitamente (docs/TIDB.md). MySQL y MariaDB no tienen esta
// variable, así que "variable desconocida" se ignora ahí: es la señal de que no es TiDB.
export async function habilitarMultiplesSentenciasEnTiDB(conexion: Pick<Connection, "query">): Promise<void> {
  try {
    await conexion.query("SET SESSION tidb_multi_statement_mode = 'ON'");
  } catch (error) {
    const errno = (error as { errno?: unknown } | null)?.errno;
    if (errno !== ER_UNKNOWN_SYSTEM_VARIABLE) throw error;
  }
}

// Conexión suelta (no del pool) para los scripts y las pruebas de integración, con la misma
// sesión que la aplicación: UTC y modo estricto.
export async function abrirConexion(cadena: string, opciones: OpcionesConexion = {}): Promise<Connection> {
  const conexion = await createConnection({
    ...opcionesDeConexion(cadena),
    multipleStatements: opciones.multiplesSentencias ?? false,
  });
  // Sin este manejador, un corte de conexión tumbaría el proceso; el error real llega por la consulta.
  conexion.on("error", () => {});
  try {
    await conexion.query(SQL_INICIO_SESION);
    if (opciones.multiplesSentencias) await habilitarMultiplesSentenciasEnTiDB(conexion);
  } catch (error) {
    await conexion.end().catch(() => {});
    throw error;
  }
  return conexion;
}
