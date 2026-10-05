// Compara el total del período elegido contra el período inmediatamente anterior de igual
// duración. `null` cuando el período anterior no tiene ningún clic: un "+100%" contra una base de
// cero no es un dato honesto. Lo comparten las tarjetas KPI y la tabla de calor.
export function calcularTendencia(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}
