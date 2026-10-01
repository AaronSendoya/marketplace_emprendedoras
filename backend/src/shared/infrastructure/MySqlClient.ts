import { createPool, type Pool, type PoolConnection, type ResultSetHeader } from "mysql2/promise";
import { getEnv } from "@/shared/config/env";
import { traducirErrorMySql } from "./errorMySql";
import { opcionesDeConexion, SQL_INICIO_SESION } from "./opcionesMySql";

export interface ResultadoEscritura {
  filasAfectadas: number;
}

// Lo comparten MySqlClient y la transacción: un repositorio funciona igual dentro o fuera de ella.
// `consultar` es para SELECT; `ejecutar` para INSERT, UPDATE y DELETE. MySQL no tiene RETURNING:
// los ids los genera la aplicación antes de insertar. `filasAfectadas` cuenta las filas que
// cumplen el WHERE aunque el UPDATE no cambie su valor (mysql2 activa FOUND_ROWS).
export interface EjecutorSql {
  consultar<R extends object = Record<string, unknown>>(texto: string, valores?: unknown[]): Promise<R[]>;
  ejecutar(texto: string, valores?: unknown[]): Promise<ResultadoEscritura>;
}

type ConQuery = Pick<Pool | PoolConnection, "query">;

// Los fallos por datos del usuario (duplicados, referencias inexistentes...) salen como errores
// de dominio. Se usa `query` (no `execute`): escapa los valores en el cliente y admite `IN (?)`.
class EjecutorMySql implements EjecutorSql {
  constructor(private readonly destino: ConQuery) {}

  async consultar<R extends object = Record<string, unknown>>(texto: string, valores: unknown[] = []): Promise<R[]> {
    try {
      const [filas] = await this.destino.query(texto, valores);
      return (Array.isArray(filas) ? filas : []) as R[];
    } catch (error) {
      throw traducirErrorMySql(error);
    }
  }

  async ejecutar(texto: string, valores: unknown[] = []): Promise<ResultadoEscritura> {
    try {
      const [resultado] = await this.destino.query(texto, valores);
      return { filasAfectadas: (resultado as ResultSetHeader).affectedRows ?? 0 };
    } catch (error) {
      throw traducirErrorMySql(error);
    }
  }
}

export interface OpcionesMySqlClient {
  maxConexiones?: number;
}

export class MySqlClient extends EjecutorMySql {
  private readonly pool: Pool;

  constructor(cadenaConexion: string, opciones: OpcionesMySqlClient = {}) {
    const limite = opciones.maxConexiones ?? 5;
    const pool = createPool({
      ...opcionesDeConexion(cadenaConexion),
      connectionLimit: limite,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      // TiDB Cloud corta las conexiones inactivas a los 340 s y el keep-alive no lo evita: el
      // primer request tras un rato quieto usaría una conexión muerta y daría 500. mysql2 solo
      // recicla las inactivas cuando maxIdle es menor que connectionLimit.
      idleTimeout: 60_000,
      maxIdle: Math.max(limite - 1, 0),
    });
    // Cada conexión nueva del pool nace con la sesión en UTC y en modo estricto. El evento entrega
    // la conexión de la API con callbacks y sus comandos van en cola: este corre antes que
    // cualquier consulta que la use. Si fallara, se descarta la conexión en vez de usarla a medias.
    pool.pool.on("connection", (conexion) => {
      conexion.query(SQL_INICIO_SESION, (error) => {
        if (error) conexion.destroy();
      });
    });
    super(pool);
    this.pool = pool;
  }

  // Las transacciones usan una conexión propia del pool. MySQL no revierte el DDL, pero aquí solo
  // hay DML.
  async transaccion<T>(trabajo: (tx: EjecutorSql) => Promise<T>): Promise<T> {
    const conexion = await this.pool.getConnection();
    try {
      await conexion.beginTransaction();
      // El error del trabajo ya sale traducido por el ejecutor: el trabajo puede capturar un
      // ErrorConflicto y decidir qué hacer antes de que se revierta.
      const resultado = await trabajo(new EjecutorMySql(conexion));
      await conexion.commit();
      return resultado;
    } catch (error) {
      await conexion.rollback().catch(() => {});
      throw traducirErrorMySql(error);
    } finally {
      conexion.release();
    }
  }

  async cerrar(): Promise<void> {
    await this.pool.end();
  }
}

// En desarrollo, Next recarga los módulos y cada recarga abriría otro pool: se guarda en globalThis.
const global = globalThis as typeof globalThis & { __mysqlClient?: MySqlClient };

export function getMySqlClient(): MySqlClient {
  const env = getEnv();
  global.__mysqlClient ??= new MySqlClient(env.DATABASE_URL, { maxConexiones: env.DATABASE_POOL_MAX });
  return global.__mysqlClient;
}
