import { ErrorValidacion } from "@/shared/domain/errors";

export type EstadoDescuento = "programado" | "vigente" | "vencido";

export interface Vigencia {
  inicio: Date | null;
  fin: Date | null;
}

// Regla 8: America/La_Paz es UTC-4 todo el año (sin horario de verano).
const OFFSET_LA_PAZ_MS = 4 * 60 * 60 * 1000;

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const FECHA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const CON_ZONA = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

const CAMPO = { inicio: "fecha_inicio", fin: "fecha_fin" } as const;

function error(extremo: "inicio" | "fin", mensaje: string) {
  return new ErrorValidacion(mensaje, [{ campo: CAMPO[extremo], mensaje }]);
}

// Rechaza fechas imposibles como 2026-02-30 (Date las "corrige" en silencio).
function fechaReal(anio: number, mes: number, dia: number): boolean {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

const FORMATOS = "Usa YYYY-MM-DD, YYYY-MM-DDTHH:mm (hora de La Paz) o una fecha ISO con zona horaria.";

// Regla 8: convierte lo que escribe la persona a un instante en UTC.
//   YYYY-MM-DD           día completo en La Paz: el inicio a las 00:00:00 y el fin a las 23:59:59.
//   YYYY-MM-DDTHH:mm[:ss] hora de La Paz.
//   ISO con zona         se respeta la zona indicada.
export function interpretarFecha(texto: string, extremo: "inicio" | "fin"): Date {
  const entrada = texto.trim();

  const solo = SOLO_FECHA.exec(entrada);
  const conHora = FECHA_HORA.exec(entrada);
  const conZona = CON_ZONA.exec(entrada);
  const partes = solo ?? conHora ?? conZona;
  if (!partes) throw error(extremo, `La fecha no tiene un formato válido. ${FORMATOS}`);
  if (!fechaReal(Number(partes[1]), Number(partes[2]), Number(partes[3]))) throw error(extremo, "La fecha no existe en el calendario.");

  let fecha: Date;
  if (conZona) {
    fecha = new Date(entrada);
  } else {
    const [hora, minuto, segundo] = solo
      ? extremo === "inicio"
        ? [0, 0, 0]
        : [23, 59, 59]
      : [Number(conHora![4]), Number(conHora![5]), Number(conHora![6] ?? 0)];
    if (hora > 23 || minuto > 59 || segundo > 59) throw error(extremo, "La hora no es válida.");
    fecha = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]), hora, minuto, segundo) + OFFSET_LA_PAZ_MS);
  }
  if (Number.isNaN(fecha.getTime())) throw error(extremo, "La fecha o la hora no son válidas.");
  return fecha;
}

// Si existen ambas fechas, fecha_fin debe ser posterior a fecha_inicio (regla 8).
export function validarRango(vigencia: Vigencia): void {
  if (vigencia.inicio && vigencia.fin && vigencia.fin.getTime() <= vigencia.inicio.getTime()) {
    throw error("fin", "La fecha de fin debe ser posterior a la de inicio.");
  }
}

// Ambas fechas son opcionales e independientes: sin inicio rige desde que se crea; sin fin es permanente.
export function crearVigencia(entrada: { fechaInicio?: string | null; fechaFin?: string | null }): Vigencia {
  const vigencia = {
    inicio: entrada.fechaInicio ? interpretarFecha(entrada.fechaInicio, "inicio") : null,
    fin: entrada.fechaFin ? interpretarFecha(entrada.fechaFin, "fin") : null,
  };
  validarRango(vigencia);
  return vigencia;
}

// Misma condición que la consulta del feed: vigente cuando ya empezó y aún no caducó (el último
// instante de `fin` todavía cuenta).
export function estadoDescuento(vigencia: Vigencia, ahora: Date): EstadoDescuento {
  if (vigencia.inicio && vigencia.inicio.getTime() > ahora.getTime()) return "programado";
  if (vigencia.fin && vigencia.fin.getTime() < ahora.getTime()) return "vencido";
  return "vigente";
}
