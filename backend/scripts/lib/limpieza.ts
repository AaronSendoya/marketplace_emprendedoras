// Regla 17 (retención de registros de abuso): `intentos_login` y `otp_codigos` los escriben endpoints públicos, así que sin
// límite un ataque podría llenar la base. Lógica pura del script `pnpm db:limpiar` (scripts/limpiar-registros.ts).

export const DIAS_CONSERVAR_INTENTOS_LOGIN = 30;
export const DIAS_CONSERVAR_OTP = 7;
// Una sesión de Admin vencida ya no vale para nada (el backend la rechaza); solo se conserva un día por si hay que investigar algo.
export const DIAS_CONSERVAR_SESIONES_VENCIDAS = 1;
// Se borra por lotes: una sola sentencia sobre millones de filas superaría el tamaño máximo de transacción de TiDB.
export const TAMANO_LOTE = 5000;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Lo único que el script necesita de la base: ejecutar un borrado y saber cuántas filas borró.
export interface EjecutorBorrado {
  borrar(sql: string, valores: unknown[]): Promise<number>;
}

export interface ResultadoLimpieza {
  intentosLogin: number;
  otp: number;
  sesiones: number;
}

// Sentencias fijas, sin interpolar nada: la fecha de corte y el tamaño del lote viajan como parámetros.
const BORRAR_INTENTOS_LOGIN = "DELETE FROM intentos_login WHERE creado_en < ? LIMIT ?";
const BORRAR_OTP = "DELETE FROM otp_codigos WHERE creado_en < ? LIMIT ?";
// Solo las que vencen (Admin): las de una Emprendedora no tienen `expira_en` y duran hasta que cierre sesión (regla 5).
const BORRAR_SESIONES_VENCIDAS = "DELETE FROM sesiones WHERE expira_en IS NOT NULL AND expira_en < ? LIMIT ?";

async function borrarPorLotes(ejecutor: EjecutorBorrado, sql: string, corte: Date): Promise<number> {
  let total = 0;
  for (;;) {
    const borradas = await ejecutor.borrar(sql, [corte, TAMANO_LOTE]);
    total += borradas;
    if (borradas < TAMANO_LOTE) return total;
  }
}

export async function limpiarRegistrosAntiguos(ejecutor: EjecutorBorrado, ahora: Date): Promise<ResultadoLimpieza> {
  const corteIntentos = new Date(ahora.getTime() - DIAS_CONSERVAR_INTENTOS_LOGIN * MS_POR_DIA);
  const corteOtp = new Date(ahora.getTime() - DIAS_CONSERVAR_OTP * MS_POR_DIA);
  const corteSesiones = new Date(ahora.getTime() - DIAS_CONSERVAR_SESIONES_VENCIDAS * MS_POR_DIA);
  return {
    intentosLogin: await borrarPorLotes(ejecutor, BORRAR_INTENTOS_LOGIN, corteIntentos),
    otp: await borrarPorLotes(ejecutor, BORRAR_OTP, corteOtp),
    sesiones: await borrarPorLotes(ejecutor, BORRAR_SESIONES_VENCIDAS, corteSesiones),
  };
}
