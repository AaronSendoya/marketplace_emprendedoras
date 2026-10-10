"use server";

import {
  cambiarEstadoProductoAction,
  crearProductoAction,
  editarProductoAction,
  reemplazarImagenProductoAction,
  type EstadoFormularioProducto,
} from "@/lib/admin/productos-acciones";
import { obtenerMe } from "@/lib/api/auth";
import type { ResultadoDeAccion } from "@/lib/errores/accion";
import { refrescarNegocio } from "./refrescar";

// Acciones del panel de la Emprendedora sobre sus propios productos: misma lógica que las del Admin
// (ver perfil-acciones.ts), con la ruta a refrescar propia. Una emprendedora crea siempre en su
// perfil, así que el formulario no manda `perfil_id` (regla 18, backend).

export async function crearProductoNegocioAction(estadoPrevio: EstadoFormularioProducto, formData: FormData): Promise<EstadoFormularioProducto> {
  const yo = await obtenerMe();
  const estado = await crearProductoAction(yo.id, estadoPrevio, formData);
  if (estado.guardado) refrescarNegocio();
  return estado;
}

export async function editarProductoNegocioAction(
  productoId: string,
  estadoPrevio: EstadoFormularioProducto,
  formData: FormData,
): Promise<EstadoFormularioProducto> {
  const yo = await obtenerMe();
  const estado = await editarProductoAction(productoId, yo.id, estadoPrevio, formData);
  if (estado.guardado) refrescarNegocio();
  return estado;
}

export async function reemplazarImagenProductoNegocioAction(
  productoId: string,
  estadoPrevio: EstadoFormularioProducto,
  formData: FormData,
): Promise<EstadoFormularioProducto> {
  const yo = await obtenerMe();
  const estado = await reemplazarImagenProductoAction(productoId, yo.id, estadoPrevio, formData);
  if (estado.guardado) refrescarNegocio();
  return estado;
}

// Publicar u ocultar (`activo`): se llama directo desde el onConfirmar de un ConfirmModal.
export async function cambiarEstadoProductoNegocioAction(productoId: string, activo: boolean): Promise<ResultadoDeAccion> {
  const yo = await obtenerMe();
  const resultado = await cambiarEstadoProductoAction(productoId, activo, yo.id);
  if (!resultado.error) refrescarNegocio();
  return resultado;
}
