// Calca los límites del backend (`src/api/openapi/rutas/productos.ts` y `descuentos.ts`): hay que
// mantenerlos en sync a mano, mismo criterio que otras constantes duplicadas del proyecto (ej.
// OFFSET_LA_PAZ_MS). Esto es solo feedback visual anticipado (onBlur): la fuente de verdad del
// rechazo real sigue siendo el Zod del backend.
export const LIMITES_PRODUCTO = { nombreMin: 3, nombreMax: 150, descripcionMax: 2000 };

// Detalle opcional de un descuento (regla 8): el mismo límite de `descuentos.descripcion` (VARCHAR(280)). Se cuenta
// con `.length`, igual que `maxLength` del campo y que la API: un emoji cuenta 2.
export const LIMITES_DESCUENTO = { descripcionMax: 280 };

const CONTIENE_LETRA = /\p{L}/u;

export function errorNombreProducto(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return "El nombre es obligatorio.";
  if (texto.length < LIMITES_PRODUCTO.nombreMin) return "Debe tener al menos 3 caracteres.";
  if (texto.length > LIMITES_PRODUCTO.nombreMax) return `No puede superar los ${LIMITES_PRODUCTO.nombreMax} caracteres.`;
  if (!CONTIENE_LETRA.test(texto)) return "Debe incluir al menos una letra.";
  return null;
}

export function errorDescripcionProducto(valor: string): string | null {
  return valor.trim().length > LIMITES_PRODUCTO.descripcionMax
    ? `No puede superar los ${LIMITES_PRODUCTO.descripcionMax} caracteres.`
    : null;
}

export function errorPorcentajeDescuento(valor: string): string | null {
  if (!valor.trim()) return "El porcentaje es obligatorio.";
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0 || numero > 100) return "Debe ser mayor que 0 y hasta 100.";
  if (Math.abs(numero * 100 - Math.round(numero * 100)) > 1e-6) return "Hasta 2 decimales.";
  return null;
}
