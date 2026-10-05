// Mismo valor por defecto que el backend sin `limite` (`EsquemaRankingQuery`). Vive en un módulo
// sin "use client" para que la página (Server Component) lo reciba como el número que es: un
// export de un módulo "use client" (ej. SelectorTopRanking) llega del otro lado como una
// referencia de cliente, no como su valor.
export const TOPE_RANKING_POR_DEFECTO = 10;

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// El día de hoy en La Paz (UTC-4 fijo, regla 8), el mismo día que usa el backend para el período por
// defecto. Quien lo necesite en un Client Component debe recibirlo de la página (Server Component)
// como prop y no volver a calcularlo: el servidor y el navegador lo calcularían en instantes
// distintos (y, cerca de la medianoche, en días distintos), y el HTML no coincidiría al hidratar.
export function hoyLaPaz(): string {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

function diferenciaDias(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / UN_DIA_MS) + 1;
}

export interface RangoConAnterior {
  actual: { desde: string; hasta: string };
  anterior: { desde: string; hasta: string };
}

// El Dashboard entero refleja el período elegido (regla 19). Para la tendencia de las tarjetas KPI
// hace falta comparar contra el período inmediatamente anterior de igual duración, no una ventana
// fija de "7 días": sin `desde`/`hasta`, el período por defecto son los últimos 30 días, igual que
// el backend sin esos parámetros. El rango se resuelve acá (no solo en el backend) porque el
// período anterior necesita fechas concretas para poder restarles su propia duración.
export function resolverRangoConAnterior(desdeParametro?: string, hastaParametro?: string): RangoConAnterior {
  const hasta = hastaParametro ?? hoyLaPaz();
  const desde = desdeParametro ?? sumarDias(hasta, -29);
  const dias = diferenciaDias(desde, hasta);
  const hastaAnterior = sumarDias(desde, -1);
  const desdeAnterior = sumarDias(hastaAnterior, -(dias - 1));
  return { actual: { desde, hasta }, anterior: { desde: desdeAnterior, hasta: hastaAnterior } };
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "6 sep – 5 oct 2026": el período que se está viendo, junto al selector. Los nombres de los meses se
// escriben a mano (no Intl) para que el servidor y el navegador produzcan el mismo texto. El año solo
// aparece al principio si el período cruza un cambio de año.
export function etiquetaRangoCorto(desde: string, hasta: string): string {
  const [anioDesde, mesDesde, diaDesde] = desde.split("-").map(Number);
  const [anioHasta, mesHasta, diaHasta] = hasta.split("-").map(Number);
  const dia = (d: number, m: number, a: number, conAnio: boolean) => `${d} ${MESES_CORTOS[m - 1]}${conAnio ? ` ${a}` : ""}`;
  if (desde === hasta) return dia(diaHasta, mesHasta, anioHasta, true);
  return `${dia(diaDesde, mesDesde, anioDesde, anioDesde !== anioHasta)} – ${dia(diaHasta, mesHasta, anioHasta, true)}`;
}
