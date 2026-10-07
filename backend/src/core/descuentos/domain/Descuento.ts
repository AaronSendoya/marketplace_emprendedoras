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
  // Detalle opcional que explica la promoción (regla 8): hasta 280 caracteres; nulo si no tiene.
  descripcion: string | null;
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
  descripcion: string | null;
  ahora: Date;
}

// `undefined` = sin cambio; `null` = quitar la fecha o el detalle.
export interface CambiosDescuento {
  porcentaje?: number;
  fechaInicio?: Date | null;
  fechaFin?: Date | null;
  descripcion?: string | null;
}

// Regla 8: el detalle del descuento tiene hasta 280 caracteres. Es el mismo límite de `descuentos.descripcion`
// (`VARCHAR(280)`, migración 0008): se valida aquí para dar un mensaje claro y no depender de que la base rechace (o,
// sin modo estricto, corte) el texto. Se cuenta en unidades UTF-16 como el resto de textos: la base cuenta
// caracteres, así que esta validación es igual o más estricta, nunca más permisiva.
export const LARGO_MAXIMO_DESCRIPCION_DESCUENTO = 280;
export const MENSAJE_DESCRIPCION_DESCUENTO = `El detalle no puede superar los ${LARGO_MAXIMO_DESCRIPCION_DESCUENTO} caracteres.`;

// Sin espacios en los extremos; vacío, solo espacios o ausente es lo mismo que no tener detalle (`null`).
export function normalizarDescripcion(descripcion: string | null | undefined): string | null {
  const texto = descripcion?.trim() ?? "";
  if (texto.length === 0) return null;
  if (texto.length > LARGO_MAXIMO_DESCRIPCION_DESCUENTO) {
    throw new ErrorValidacion(MENSAJE_DESCRIPCION_DESCUENTO, [{ campo: "descripcion", mensaje: MENSAJE_DESCRIPCION_DESCUENTO }]);
  }
  return texto;
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
