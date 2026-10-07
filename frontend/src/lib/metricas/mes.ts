// Los nombres de los meses se escriben a mano (no con Intl) para que el servidor y el navegador
// produzcan el mismo texto.
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export interface MesCalendario {
  // YYYY-MM-DD, día de La Paz (regla 8 del backend): del primer al último día del mes.
  desde: string;
  hasta: string;
  // "septiembre de 2026".
  etiqueta: string;
}

export interface MesesComparados {
  // El último mes calendario completo.
  mes: MesCalendario;
  // El mes inmediatamente anterior a ese.
  anterior: MesCalendario;
}

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

// `mes` va de 1 a 12. El día 0 del mes siguiente es el último día de este.
function mesCalendario(anio: number, mes: number): MesCalendario {
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return {
    desde: `${anio}-${dosDigitos(mes)}-01`,
    hasta: `${anio}-${dosDigitos(mes)}-${dosDigitos(ultimoDia)}`,
    etiqueta: `${MESES[mes - 1]} de ${anio}`,
  };
}

function mesAnteriorDe(anio: number, mes: number): [number, number] {
  return mes === 1 ? [anio - 1, 12] : [anio, mes - 1];
}

// El movimiento mensual del Dashboard no sigue al selector de período: compara el último mes
// calendario completo con el anterior a ese y solo cambia el primer día de cada mes (el 5 de octubre,
// septiembre frente a agosto; el 1 de noviembre, octubre frente a septiembre). Un mes en curso se
// descarta a propósito: comparar 5 días contra un mes entero, o contra 5 días, no dice nada fiable.
// `hoy` es el día de La Paz (`hoyLaPaz()`).
export function mesesParaMovimiento(hoy: string): MesesComparados {
  const [anioHoy, mesHoy] = hoy.split("-").map(Number);
  const [anioMes, numeroMes] = mesAnteriorDe(anioHoy, mesHoy);
  const [anioAnterior, numeroAnterior] = mesAnteriorDe(anioMes, numeroMes);
  return { mes: mesCalendario(anioMes, numeroMes), anterior: mesCalendario(anioAnterior, numeroAnterior) };
}
