// Sin imports: lo prueba `disponibilidad.test.ts` y lo usa `respuestas.ts`.

// Códigos de error de red y del controlador de MySQL (`mysql2`) que significan «la base de datos no está al alcance»: la conexión se
// rechazó, se cortó, se agotó el tiempo o no hay conexiones libres. No incluye errores de la consulta (sintaxis, restricciones,
// bloqueos): esos son un fallo de la aplicación y siguen siendo un `500`.
const CODIGOS_DE_NO_DISPONIBILIDAD: ReadonlySet<string> = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_SEQUENCE_TIMEOUT",
  "POOL_CLOSED",
  "POOL_ENQUEUELIMIT",
  "ER_CON_COUNT_ERROR",
  "ER_SERVER_SHUTDOWN",
  "ER_CONNECTION_KILLED",
  "ER_NET_READ_ERROR",
  "ER_NET_WRITE_ERROR",
  "ER_NET_READ_INTERRUPTED",
  "ER_NET_ERROR_ON_WRITE",
]);

const PROFUNDIDAD_MAXIMA = 4;

// Un error de conexión suele llegar envuelto (`cause`) o como un `AggregateError` (cuando `localhost` resuelve a varias direcciones y
// todas fallan), así que se revisa el código del error y el de lo que lo envuelve, con un límite de profundidad.
export function esErrorDeNoDisponibilidad(error: unknown, profundidad = 0): boolean {
  if (typeof error !== "object" || error === null || profundidad > PROFUNDIDAD_MAXIMA) return false;
  const { code, cause, errors } = error as { code?: unknown; cause?: unknown; errors?: unknown };
  if (typeof code === "string" && CODIGOS_DE_NO_DISPONIBILIDAD.has(code)) return true;
  if (esErrorDeNoDisponibilidad(cause, profundidad + 1)) return true;
  return Array.isArray(errors) && errors.length > 0 && errors.every((interno) => esErrorDeNoDisponibilidad(interno, profundidad + 1));
}
