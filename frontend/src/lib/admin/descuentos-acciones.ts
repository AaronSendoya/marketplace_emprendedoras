"use server";

import { revalidatePath } from "next/cache";
import {
  asignarDescuento,
  crearDescuentoAdmin,
  editarDescuentoAdmin,
  quitarDescuento,
  type DatosEditarDescuento,
} from "@/lib/api/descuentos";
import { mensajeDeAccion, type ResultadoDeAccion } from "@/lib/errores/accion";

// Un solo tipo de estado para alta y edición (DescuentoFormularioModal usa el mismo formulario y
// el mismo useActionState para las dos acciones, según haya o no descuento).
export interface EstadoFormularioDescuento {
  error?: string;
  guardado?: boolean;
}

// El detalle del descuento tal como lo cuenta la API (regla 8): sin espacios en los extremos y con los saltos de línea
// como `\n`. Un formulario HTML entrega los de un `textarea` como `\r\n` (dos caracteres), y con ellos un texto con
// saltos de línea que en pantalla cabe en 280 caracteres se pasaría del límite sin que quien escribe lo vea.
function detalleDelFormulario(formData: FormData): string {
  return String(formData.get("descripcion") ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
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
  const descripcion = detalleDelFormulario(formData);
  const porcentaje = Number(porcentajeTexto);

  if (!porcentajeTexto || Number.isNaN(porcentaje)) return { error: "Indica un porcentaje válido." };

  try {
    await crearDescuentoAdmin({
      perfil_id: perfilId,
      porcentaje,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      descripcion: descripcion || null,
    });
  } catch (error) {
    return { error: mensajeDeAccion("crearDescuentoAction", error, "No pudimos crear el descuento. Intenta de nuevo.") };
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
    // El formulario siempre manda el campo: vacío quita el detalle.
    descripcion: detalleDelFormulario(formData) || null,
  };

  try {
    await editarDescuentoAdmin(descuentoId, datos);
  } catch (error) {
    return { error: mensajeDeAccion("editarDescuentoAction", error, "No pudimos guardar los cambios. Intenta de nuevo.") };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return { guardado: true };
}

// Asignar y quitar, uno por uno (checklist de AsignarProductosModal): el backend no tiene un
// "reemplazar todo", solo asignar (regla 9: 403 si el producto es de otro perfil) y quitar.
export async function asignarDescuentoAction(descuentoId: string, productoId: string, usuarioId: string): Promise<ResultadoDeAccion> {
  try {
    await asignarDescuento(descuentoId, [productoId]);
  } catch (error) {
    return { error: mensajeDeAccion("asignarDescuentoAction", error, "No pudimos asignar el descuento a ese producto. Intenta de nuevo.") };
  }
  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return {};
}

export async function quitarDescuentoAction(descuentoId: string, productoId: string, usuarioId: string): Promise<ResultadoDeAccion> {
  try {
    await quitarDescuento(descuentoId, productoId);
  } catch (error) {
    return { error: mensajeDeAccion("quitarDescuentoAction", error, "No pudimos quitar el descuento de ese producto. Intenta de nuevo.") };
  }
  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return {};
}
