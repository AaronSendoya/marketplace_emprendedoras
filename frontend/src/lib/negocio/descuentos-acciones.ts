"use server";

import {
  asignarDescuentoAction,
  crearDescuentoAction,
  editarDescuentoAction,
  quitarDescuentoAction,
  type EstadoFormularioDescuento,
} from "@/lib/admin/descuentos-acciones";
import { obtenerMe } from "@/lib/api/auth";
import type { ResultadoDeAccion } from "@/lib/errores/accion";
import { refrescarNegocio } from "./refrescar";

// Acciones del panel de la Emprendedora sobre sus promociones (los "descuentos" del backend): misma
// lógica que las del Admin (ver perfil-acciones.ts), con la ruta a refrescar propia.

export async function crearDescuentoNegocioAction(
  perfilId: string,
  estadoPrevio: EstadoFormularioDescuento,
  formData: FormData,
): Promise<EstadoFormularioDescuento> {
  const yo = await obtenerMe();
  const estado = await crearDescuentoAction(perfilId, yo.id, estadoPrevio, formData);
  if (estado.guardado) refrescarNegocio();
  return estado;
}

export async function editarDescuentoNegocioAction(
  descuentoId: string,
  estadoPrevio: EstadoFormularioDescuento,
  formData: FormData,
): Promise<EstadoFormularioDescuento> {
  const yo = await obtenerMe();
  const estado = await editarDescuentoAction(descuentoId, yo.id, estadoPrevio, formData);
  if (estado.guardado) refrescarNegocio();
  return estado;
}

export async function asignarDescuentoNegocioAction(descuentoId: string, productoId: string): Promise<ResultadoDeAccion> {
  const yo = await obtenerMe();
  const resultado = await asignarDescuentoAction(descuentoId, productoId, yo.id);
  if (!resultado.error) refrescarNegocio();
  return resultado;
}

export async function quitarDescuentoNegocioAction(descuentoId: string, productoId: string): Promise<ResultadoDeAccion> {
  const yo = await obtenerMe();
  const resultado = await quitarDescuentoAction(descuentoId, productoId, yo.id);
  if (!resultado.error) refrescarNegocio();
  return resultado;
}
