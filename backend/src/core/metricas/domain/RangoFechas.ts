import { ErrorValidacion } from "@/shared/domain/errors";

export interface RangoFechas {
  desde: Date;
  hasta: Date;
}

// Regla 19 (mismo criterio que VigenciaDescuento, regla 8): America/La_Paz es UTC-4 todo el año.
const OFFSET_LA_PAZ_MS = 4 * 60 * 60 * 1000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const DIAS_POR_DEFECTO = 30;
const RANGO_MAXIMO_MS = 2 * 366 * UN_DIA_MS;

function error(campo: "desde" | "hasta", mensaje: string): ErrorValidacion {
  return new ErrorValidacion(mensaje, [{ campo, mensaje }]);
}

// Rechaza fechas imposibles como 2026-02-30 (Date las "corrige" en silencio).
function fechaReal(anio: number, mes: number, dia: number): boolean {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

// YYYY-MM-DD (día de La Paz) al instante UTC de su inicio (00:00:00) o su fin (23:59:59.999),
// igual que interpretarFecha con los descuentos (regla 8), con los nombres de campo de esta regla.
function interpretarDia(texto: string, campo: "desde" | "hasta", extremo: "inicio" | "fin"): Date {
  const partes = SOLO_FECHA.exec(texto.trim());
  if (!partes) throw error(campo, "La fecha debe tener el formato YYYY-MM-DD.");
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (!fechaReal(anio, mes, dia)) throw error(campo, "La fecha no existe en el calendario.");
  const [hora, minuto, segundo, milisegundo] = extremo === "inicio" ? [0, 0, 0, 0] : [23, 59, 59, 999];
  return new Date(Date.UTC(anio, mes - 1, dia, hora, minuto, segundo, milisegundo) + OFFSET_LA_PAZ_MS);
}

function formatearDiaLaPaz(ahora: Date): string {
  return new Date(ahora.getTime() - OFFSET_LA_PAZ_MS).toISOString().slice(0, 10);
}

// Sin `desde`/`hasta`, el período por defecto son los últimos 30 días (de La Paz) hasta hoy — así
// `GET /admin/metricas/*` sin parámetros sigue respondiendo algo razonable, como esquemaPaginacion.
export function resolverRango(entrada: { desde?: string; hasta?: string } | undefined, ahora: Date): RangoFechas {
  const hastaTexto = entrada?.hasta ?? formatearDiaLaPaz(ahora);
  const hasta = interpretarDia(hastaTexto, "hasta", "fin");

  let desde: Date;
  if (entrada?.desde) {
    desde = interpretarDia(entrada.desde, "desde", "inicio");
  } else {
    // Mismo día de La Paz que `hasta`, pero (DIAS_POR_DEFECTO - 1) días antes.
    const hastaDiaLaPaz = new Date(hasta.getTime() - OFFSET_LA_PAZ_MS);
    const desdeDiaLaPaz = new Date(
      Date.UTC(hastaDiaLaPaz.getUTCFullYear(), hastaDiaLaPaz.getUTCMonth(), hastaDiaLaPaz.getUTCDate() - (DIAS_POR_DEFECTO - 1)),
    );
    desde = new Date(desdeDiaLaPaz.getTime() + OFFSET_LA_PAZ_MS);
  }

  if (hasta.getTime() < desde.getTime()) throw error("hasta", 'La fecha "hasta" debe ser igual o posterior a "desde".');
  if (hasta.getTime() - desde.getTime() > RANGO_MAXIMO_MS) throw error("hasta", "El rango no puede superar los 2 años.");

  return { desde, hasta };
}

// Período inmediatamente anterior, de igual duración en días de La Paz: termina el día previo a
// `desde` (23:59:59.999) y empieza tantos días antes como dura `rango`. Como La Paz no tiene horario
// de verano (regla 8), restar días completos en milisegundos cae siempre en una medianoche de La Paz.
// No se vuelve a validar el límite de 2 años: es un período derivado, no uno que pide el usuario.
export function rangoAnterior(rango: RangoFechas): RangoFechas {
  const dias = diasDelRango(rango).length;
  return {
    desde: new Date(rango.desde.getTime() - dias * UN_DIA_MS),
    hasta: new Date(rango.desde.getTime() - 1),
  };
}

// Trunca al mediodía UTC... no, a la medianoche UTC del mismo día de calendario que marca `fecha`
// (ignora la hora): sirve para contar días completos sin que 23:59:59.999 cuente de más.
function medianocheUtc(fecha: Date): number {
  return Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
}

// Días de La Paz entre `rango.desde` y `rango.hasta`, inclusive — para completar la serie diaria
// sin huecos (regla 19: los días sin clics vienen en 0).
export function diasDelRango(rango: RangoFechas): string[] {
  const inicioLaPaz = medianocheUtc(new Date(rango.desde.getTime() - OFFSET_LA_PAZ_MS));
  const finLaPaz = medianocheUtc(new Date(rango.hasta.getTime() - OFFSET_LA_PAZ_MS));
  const totalDias = Math.round((finLaPaz - inicioLaPaz) / UN_DIA_MS) + 1;
  return Array.from({ length: totalDias }, (_, i) => new Date(inicioLaPaz + i * UN_DIA_MS).toISOString().slice(0, 10));
}
