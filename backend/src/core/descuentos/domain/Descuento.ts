import type { Actor } from "@/shared/domain/Actor";
import { ErrorValidacion } from "@/shared/domain/errors";
import type { EstadoDescuento } from "./VigenciaDescuento";

export interface Descuento {
  id: string;
  perfilId: string;
  // Dueña del perfil: para comprobar quién puede gestionar el descuento.
  perfilUsuarioId: string;
  // Siempre por porcentaje, mayor que 0 y hasta 100 (regla 8).
  porcentaje: number;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  creadoEn: Date;
  productoIds: string[];
}

export interface DescuentoConEstado extends Descuento {
  estado: EstadoDescuento;
}

export interface NuevoDescuento {
  perfilId: string;
  porcentaje: number;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  ahora: Date;
}

// `undefined` = sin cambio; `null` = quitar la fecha.
export interface CambiosDescuento {
  porcentaje?: number;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
}

export function validarPorcentaje(porcentaje: number): void {
  const centesimas = porcentaje * 100;
  const valido =
    Number.isFinite(porcentaje) && porcentaje > 0 && porcentaje <= 100 && Math.abs(centesimas - Math.round(centesimas)) < 1e-6;
  if (valido) return;
  const mensaje = "El porcentaje debe ser mayor que 0 y hasta 100, con hasta 2 decimales.";
  throw new ErrorValidacion(mensaje, [{ campo: "porcentaje", mensaje }]);
}

// Regla 18: la dueña gestiona los descuentos de su perfil; el Admin, los de cualquiera.
export const puedeGestionarDescuento = (actor: Actor, descuento: Pick<Descuento, "perfilUsuarioId">) =>
  actor.rol === "Admin" || descuento.perfilUsuarioId === actor.id;
