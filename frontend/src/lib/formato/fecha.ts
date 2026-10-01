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
