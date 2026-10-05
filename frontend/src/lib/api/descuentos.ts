import { actualizarJsonAutenticado, eliminarAutenticado, enviarJsonAutenticado, obtenerJsonAutenticado } from "./cliente";
import type { Descuento, EstadoDescuento, Pagina, ParametrosPagina } from "./tipos";

// `estado` filtra en el backend (regla 8): solo los descuentos en ese estado, con el total ya filtrado.
export interface FiltrosDescuentos extends ParametrosPagina {
  estado?: EstadoDescuento;
}

// GET /admin/usuarios/{id}/descuentos (módulo "Emprendimientos"): los descuentos del perfil de esa
// cuenta, con su vigencia calculada al consultar. Sin perfil, la lista viene vacía.
export const listarDescuentosDeUsuario = (usuarioId: string, filtros: FiltrosDescuentos = {}) =>
  obtenerJsonAutenticado<Pagina<Descuento>>(`/admin/usuarios/${usuarioId}/descuentos`, { parametros: { ...filtros } });

// GET /mis/descuentos (panel de la Emprendedora): mismo formato que el de arriba, pero de la cuenta
// autenticada, con `estado` (programado, vigente o vencido) calculado por el backend.
export const listarMisDescuentos = (filtros: FiltrosDescuentos = {}) =>
  obtenerJsonAutenticado<Pagina<Descuento>>("/mis/descuentos", { parametros: { ...filtros } });

export interface DatosNuevoDescuento {
  perfil_id: string;
  porcentaje: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

// POST /descuentos: el Admin siempre indica `perfil_id` (regla 18, backend).
export const crearDescuentoAdmin = (datos: DatosNuevoDescuento) => enviarJsonAutenticado<Descuento>("/descuentos", datos);

export interface DatosEditarDescuento {
  porcentaje?: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

// PATCH /descuentos/{id}. No hay borrar: un descuento se termina editando `fecha_fin` (regla 8).
export const editarDescuentoAdmin = (descuentoId: string, datos: DatosEditarDescuento) =>
  actualizarJsonAutenticado<Descuento>(`/descuentos/${descuentoId}`, datos);

// POST /descuentos/{id}/productos: asigna (es idempotente); todos los productos deben ser del
// mismo perfil que el descuento (regla 9, backend) o responde 403 sin asignar ninguno.
export const asignarDescuento = (descuentoId: string, productoIds: string[]) =>
  enviarJsonAutenticado<Descuento>(`/descuentos/${descuentoId}/productos`, { producto_ids: productoIds });

// DELETE /descuentos/{id}/productos/{producto_id}: quita solo la asignación, el descuento sigue
// existiendo. Es idempotente.
export const quitarDescuento = (descuentoId: string, productoId: string) =>
  eliminarAutenticado(`/descuentos/${descuentoId}/productos/${productoId}`);
