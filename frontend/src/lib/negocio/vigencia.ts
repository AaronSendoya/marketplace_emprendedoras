import type { Descuento } from "@/lib/api/tipos";
import { formatearFechaLaPaz } from "@/lib/formato/fecha";

export const ETIQUETA_ESTADO_PROMOCION: Record<Descuento["estado"], string> = {
  programado: "Programada",
  vigente: "Vigente",
  vencido: "Vencida",
};

// La vigencia ya viene decidida por el backend en `estado` (regla 8); esto solo la dice con
// palabras, con las fechas en hora de La Paz.
export function textoVigencia(descuento: Descuento): string {
  const desde = descuento.fecha_inicio ? formatearFechaLaPaz(descuento.fecha_inicio) : null;
  const hasta = descuento.fecha_fin ? formatearFechaLaPaz(descuento.fecha_fin) : null;

  switch (descuento.estado) {
    case "programado":
      return hasta ? `Desde el ${desde} hasta el ${hasta}` : `Desde el ${desde}`;
    case "vigente":
      return hasta ? `Hasta el ${hasta}` : "Sin fecha de fin";
    case "vencido":
      return hasta ? `Terminó el ${hasta}` : "Terminó";
  }
}

const PRIORIDAD: Record<Descuento["estado"], number> = { vigente: 0, programado: 1, vencido: 2 };

// Lo vigente primero, después lo que viene y al final lo que ya terminó; dentro de cada grupo se
// respeta el orden del backend.
export function ordenarPromociones(descuentos: Descuento[]): Descuento[] {
  return [...descuentos].sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado]);
}
