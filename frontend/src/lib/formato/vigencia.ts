import { diasHastaLaPaz, formatearFechaLaPaz } from "./fecha";

// Cuántos días antes de terminar una promoción se avisa de que termina pronto (CLAUDE.md sección 6, regla 14, punto l).
export const DIAS_PARA_AVISAR = 7;

export interface VigenciaDePromocion {
  // «Hasta el 30 de octubre» o «Sin fecha de fin».
  texto: string;
  // Termina en 7 días o menos: se dice con cuántos y se destaca.
  urgente: boolean;
  // «termina hoy», «termina mañana» o «termina en 4 días»; vacío si todavía falta más.
  aviso: string;
}

// La vigencia de una promoción tal como la ve el visitante, en hora de La Paz (regla 8, backend): `fecha_fin` se guarda como las 23:59:59 de
// La Paz, que en UTC ya es el día siguiente, por eso se usan `formatearFechaLaPaz` y `diasHastaLaPaz`. Sin fecha de fin es permanente.
export function describirVigencia(fechaFin: string | null, ahora: Date = new Date()): VigenciaDePromocion {
  if (fechaFin === null) return { texto: "Sin fecha de fin", urgente: false, aviso: "" };
  const dias = diasHastaLaPaz(fechaFin, ahora);
  const urgente = dias <= DIAS_PARA_AVISAR;
  const aviso = !urgente ? "" : dias <= 0 ? "termina hoy" : dias === 1 ? "termina mañana" : `termina en ${dias} días`;
  return { texto: `Hasta el ${formatearFechaLaPaz(fechaFin, "si-distinto", ahora)}`, urgente, aviso };
}
