import type { ResumenClics } from "@/lib/api/tipos";

export interface ParticipacionCanales {
  total: number;
  // Porcentaje de 0 a 100 de los clics del período. `null` si no hubo clics: no existe un porcentaje
  // honesto de cero (mismo criterio que `calcularCuota` y `calcularTendencia`).
  whatsapp: number | null;
  instagram: number | null;
}

// Qué parte de los clics de un período llegó por cada canal (WhatsApp e Instagram).
export function participacionPorCanal(resumen: ResumenClics): ParticipacionCanales {
  const total = resumen.whatsapp + resumen.instagram;
  if (total <= 0) return { total, whatsapp: null, instagram: null };
  return { total, whatsapp: (resumen.whatsapp / total) * 100, instagram: (resumen.instagram / total) * 100 };
}

// Cuánto cambió la participación de un canal frente al período anterior, en puntos porcentuales y con
// un decimal. Se calcula con las participaciones sin redondear: restar dos valores ya redondeados
// acumularía el error de ambos. `null` si alguno de los dos períodos no tuvo clics.
export function cambioEnPuntos(actual: number | null, anterior: number | null): number | null {
  if (actual === null || anterior === null) return null;
  return Math.round((actual - anterior) * 10) / 10;
}

// Misma región fija (es-BO, coma decimal) que `formatearPorcentaje`: no depende de la configuración
// del servidor ni del navegador, así que los dos producen el mismo texto.
const formateadorPuntos = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 1 });

export function formatearPuntos(valor: number): string {
  return formateadorPuntos.format(valor);
}
