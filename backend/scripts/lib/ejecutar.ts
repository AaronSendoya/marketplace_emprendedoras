const ERRORES_DE_RED = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "PROTOCOL_CONNECTION_LOST",
]);

// Convierte los fallos más comunes de conexión en una indicación de qué revisar.
export function mensajeAmigable(error: unknown): string {
  const { code } = (error ?? {}) as { code?: unknown };
  const texto = error instanceof Error ? error.message : String(error ?? "");

  switch (code) {
    case "ER_ACCESS_DENIED_ERROR":
      return "La base de datos rechazó el usuario o la contraseña: revisa la cadena de conexión de .env.local.";
    case "ER_BAD_DB_ERROR":
      return "La base de datos de la cadena de conexión no existe: créala o revisa su nombre.";
    case "ER_DBACCESS_DENIED_ERROR":
      return "El usuario no tiene permisos sobre esa base de datos: revisa sus privilegios.";
    case "ER_HOST_NOT_PRIVILEGED":
    case "ER_HOST_IS_BLOCKED":
      return "El servidor no acepta conexiones desde este equipo: en hPanel activa MySQL remoto con tu IP.";
    case "ER_CON_COUNT_ERROR":
    case "ER_USER_LIMIT_REACHED":
      return "Hay demasiadas conexiones abiertas a la base: cierra las que sobren o reduce DATABASE_POOL_MAX.";
  }
  if (typeof code === "string" && ERRORES_DE_RED.has(code)) {
    return "No se pudo conectar a la base de datos: revisa que el servidor esté encendido y el host y el puerto de la cadena de conexión de .env.local.";
  }
  return texto || "Error desconocido.";
}

export function ejecutar(principal: () => Promise<void>): void {
  principal().catch((error: unknown) => {
    console.error(mensajeAmigable(error));
    process.exit(1);
  });
}
