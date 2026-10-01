"use server";

import { revalidatePath } from "next/cache";
import {
  asignarDescuento,
  crearDescuentoAdmin,
  editarDescuentoAdmin,
  quitarDescuento,
  type DatosEditarDescuento,
} from "@/lib/api/descuentos";
import { ErrorApi } from "@/lib/api/cliente";

// Un solo tipo de estado para alta y edición (DescuentoFormularioModal usa el mismo formulario y
// el mismo useActionState para las dos acciones, según haya o no descuento).
export interface EstadoFormularioDescuento {
  error?: string;
  guardado?: boolean;
}

export async function crearDescuentoAction(
  perfilId: string,
  usuarioId: string,
  _estadoPrevio: EstadoFormularioDescuento,
  formData: FormData,
): Promise<EstadoFormularioDescuento> {
  const porcentajeTexto = String(formData.get("porcentaje") ?? "").trim();
  const fechaInicio = String(formData.get("fecha_inicio") ?? "").trim();
  const fechaFin = String(formData.get("fecha_fin") ?? "").trim();
  const porcentaje = Number(porcentajeTexto);

  if (!porcentajeTexto || Number.isNaN(porcentaje)) return { error: "Indica un porcentaje válido." };

  try {
    await crearDescuentoAdmin({
      perfil_id: perfilId,
      porcentaje,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
    });
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 400) return { error: error.message };
    return { error: "No pudimos crear el descuento. Intenta de nuevo." };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return { guardado: true };
}

// Regla 8 (backend): un descuento no se borra, se termina editando `fecha_fin`. Por eso este mismo
// formulario sirve tanto para cambiar el porcentaje o las fechas como para terminarlo.
export async function editarDescuentoAction(
  descuentoId: string,
  usuarioId: string,
  _estadoPrevio: EstadoFormularioDescuento,
  formData: FormData,
): Promise<EstadoFormularioDescuento> {
  const porcentajeTexto = String(formData.get("porcentaje") ?? "").trim();
  const fechaInicio = String(formData.get("fecha_inicio") ?? "").trim();
  const fechaFin = String(formData.get("fecha_fin") ?? "").trim();

  const datos: DatosEditarDescuento = {
    porcentaje: porcentajeTexto ? Number(porcentajeTexto) : undefined,
    fecha_inicio: fechaInicio || null,
    fecha_fin: fechaFin || null,
  };

  try {
    await editarDescuentoAdmin(descuentoId, datos);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 400) return { error: error.message };
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return { guardado: true };
}

// Asignar y quitar, uno por uno (checklist de AsignarProductosModal): el backend no tiene un
// "reemplazar todo", solo asignar (regla 9: 403 si el producto es de otro perfil) y quitar.
export async function asignarDescuentoAction(descuentoId: string, productoId: string, usuarioId: string): Promise<void> {
  await asignarDescuento(descuentoId, [productoId]);
  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
}

export async function quitarDescuentoAction(descuentoId: string, productoId: string, usuarioId: string): Promise<void> {
  await quitarDescuento(descuentoId, productoId);
  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
}
