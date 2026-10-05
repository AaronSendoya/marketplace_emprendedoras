// Fecha larga en español ("28 de septiembre de 2026"), para datos de solo lectura (ej. cuándo se
// creó una cuenta). La API siempre entrega ISO 8601 en UTC.
export function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

// America/La_Paz es UTC-4 todo el año, sin horario de verano (regla 8, backend). El backend guarda
// `fecha_inicio` como 00:00:00 de La Paz y `fecha_fin` como 23:59:59 de La Paz: para `fecha_fin`,
// eso cae en UTC ya del día siguiente, así que tomar solo los primeros 10 caracteres del ISO UTC
// mostraría un día de más en el `<input type="date">` de edición. Se resta el offset antes de leer
// el día, para los dos campos por igual.
const OFFSET_LA_PAZ_MS = 4 * 60 * 60 * 1000;

export function fechaParaInputLaPaz(iso: string | null): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() - OFFSET_LA_PAZ_MS).toISOString().slice(0, 10);
}

// Día de calendario de La Paz, desplazado para poder leerlo en UTC: formatear con la zona del
// servidor mostraría un día de más en `fecha_fin` (23:59:59 de La Paz ya es el día siguiente en
// UTC, que es la zona de un servidor en producción).
function diaLaPaz(fecha: Date): Date {
  return new Date(fecha.getTime() - OFFSET_LA_PAZ_MS);
}

// "31 de octubre". Con `anio: "si-distinto"` (por defecto) el año solo aparece cuando no es el
// actual ("31 de octubre de 2027"): una promoción casi siempre cae en el año corriente y repetirlo
// es ruido. `anio: "siempre"` conserva el formato largo de formatearFecha, ya sin el desfase.
export function formatearFechaLaPaz(iso: string, anio: "siempre" | "si-distinto" = "si-distinto", ahora: Date = new Date()): string {
  const dia = diaLaPaz(new Date(iso));
  const conAnio = anio === "siempre" || dia.getUTCFullYear() !== diaLaPaz(ahora).getUTCFullYear();
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "long",
    ...(conAnio ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(dia);
}

// Días de calendario (no horas) desde hoy hasta ese instante, en La Paz: 0 es hoy, 1 mañana,
// negativo ya pasó.
export function diasHastaLaPaz(iso: string, ahora: Date = new Date()): number {
  const aMedianoche = (fecha: Date) => {
    const dia = diaLaPaz(fecha);
    return Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate());
  };
  return Math.round((aMedianoche(new Date(iso)) - aMedianoche(ahora)) / (24 * 60 * 60 * 1000));
}
