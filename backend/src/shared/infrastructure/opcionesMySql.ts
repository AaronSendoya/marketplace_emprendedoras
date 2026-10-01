import type { ConnectionOptions } from "mysql2";

// Sin imports de `@/`: lo usan tanto la aplicación como los scripts (que corren con tsx).

// Al abrir cada conexión: las fechas por defecto de la base (creado_en...) salen en UTC, aunque
// el servidor esté en otra zona, y el modo estricto rechaza datos truncados en vez de recortarlos.
// ONLY_FULL_GROUP_BY se fuerza para que las consultas sean portables entre MySQL y MariaDB.
export const SQL_INICIO_SESION =
  "SET time_zone = '+00:00', SESSION sql_mode = CONCAT_WS(',', NULLIF(@@sql_mode, ''), 'STRICT_ALL_TABLES', 'ONLY_FULL_GROUP_BY')";

export interface ParametrosMySql {
  host: string;
  puerto: number;
  usuario: string;
  clave: string;
  base: string;
  ssl: "verificado" | "sin-verificar" | undefined;
}

// mysql://usuario:clave@host:3306/base?ssl=true. Usuario y clave llegan codificados en la URL.
export function parsearUrlMySql(cadena: string): ParametrosMySql {
  let url: URL;
  try {
    url = new URL(cadena);
  } catch {
    throw new Error("La cadena de conexión no es una URL válida (formato: mysql://usuario:clave@host:3306/base).");
  }
  if (url.protocol !== "mysql:") {
    throw new Error("La cadena de conexión debe empezar con mysql://");
  }
  const base = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!base) {
    throw new Error("La cadena de conexión debe indicar el nombre de la base (mysql://usuario:clave@host:3306/base).");
  }

  const ssl = url.searchParams.get("ssl");
  return {
    host: url.hostname,
    puerto: url.port ? Number(url.port) : 3306,
    usuario: decodeURIComponent(url.username),
    clave: decodeURIComponent(url.password),
    base,
    ssl: ssl === "true" ? "verificado" : ssl === "no-verify" ? "sin-verificar" : undefined,
  };
}

// Único caso donde una conexión sin cifrar es aceptable: el propio computador. Cualquier otro
// host (Hostinger en producción, o un acceso remoto temporal para migrar) debe cifrarse.
const ESLOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]); // new URL().hostname conserva los corchetes en IPv6
const esHostLocal = (host: string) => ESLOOPBACK.has(host.toLowerCase());

// Las fechas viajan siempre como UTC (`timezone: "Z"`): un Date de JavaScript se guarda tal cual.
// Los DECIMAL llegan como texto (comportamiento por defecto): no se pierde precisión en los precios.
// Regla 17 (datos en tránsito): fuera del computador, la conexión a MySQL exige TLS.
export function opcionesDeConexion(cadena: string): ConnectionOptions {
  const parametros = parsearUrlMySql(cadena);
  if (parametros.ssl === undefined && !esHostLocal(parametros.host)) {
    throw new Error(
      `La conexión a "${parametros.host}" no es local: agrega ?ssl=true (o ?ssl=no-verify si el certificado no es de una entidad reconocida) al final de la cadena de conexión.`,
    );
  }
  return {
    host: parametros.host,
    port: parametros.puerto,
    user: parametros.usuario,
    password: parametros.clave,
    database: parametros.base,
    charset: "utf8mb4_unicode_ci",
    timezone: "Z",
    connectTimeout: 10_000,
    ssl:
      parametros.ssl === undefined
        ? undefined
        : { minVersion: "TLSv1.2", rejectUnauthorized: parametros.ssl === "verificado" },
  };
}
