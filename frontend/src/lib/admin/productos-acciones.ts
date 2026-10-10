"use server";

import { revalidatePath } from "next/cache";
import { mensajeDeAccion, type ResultadoDeAccion } from "@/lib/errores/accion";
import {
  crearProductoAdmin,
  editarProductoAdmin,
  reemplazarImagenProducto,
  type DatosEditarProducto,
} from "@/lib/api/productos";

// Un solo tipo de estado para alta y edición (ProductoFormularioModal usa el mismo formulario y el
// mismo useActionState para las dos acciones, según haya o no producto).
export interface EstadoFormularioProducto {
  error?: string;
  guardado?: boolean;
}

// Alta de un producto en el perfil de una cuenta Emprendedor (regla 18, backend). El formulario ya
// manda `perfil_id` (campo oculto) y la imagen como `multipart/form-data`: el FormData se reenvía
// tal cual a crearProductoAdmin.
export async function crearProductoAction(
  usuarioId: string,
  _estadoPrevio: EstadoFormularioProducto,
  formData: FormData,
): Promise<EstadoFormularioProducto> {
  try {
    await crearProductoAdmin(formData);
  } catch (error) {
    return { error: mensajeDeAccion("crearProductoAction", error, "No pudimos crear el producto. Intenta de nuevo.") };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return { guardado: true };
}

export async function editarProductoAction(
  productoId: string,
  usuarioId: string,
  _estadoPrevio: EstadoFormularioProducto,
  formData: FormData,
): Promise<EstadoFormularioProducto> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const precioTexto = String(formData.get("precio") ?? "").trim();
  const mostrarPrecio = formData.get("mostrar_precio") === "true";

  if (!nombre) return { error: "El nombre es obligatorio." };

  const datos: DatosEditarProducto = {
    nombre,
    descripcion: descripcion || null,
    precio: precioTexto ? Number(precioTexto) : null,
    mostrar_precio: mostrarPrecio,
  };

  try {
    await editarProductoAdmin(productoId, datos);
  } catch (error) {
    return { error: mensajeDeAccion("editarProductoAction", error, "No pudimos guardar los cambios. Intenta de nuevo.") };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return { guardado: true };
}

// Activar o desactivar un producto desde la tabla (mismo patrón que cambiarEstadoAction de
// Cuentas): sin useActionState, se llama directo desde el onConfirmar de un ConfirmModal.
export async function cambiarEstadoProductoAction(productoId: string, activo: boolean, usuarioId: string): Promise<ResultadoDeAccion> {
  try {
    await editarProductoAdmin(productoId, { activo });
  } catch (error) {
    return { error: mensajeDeAccion("cambiarEstadoProductoAction", error, "No pudimos cambiar el estado del producto. Intenta de nuevo.") };
  }
  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return {};
}

export async function reemplazarImagenProductoAction(
  productoId: string,
  usuarioId: string,
  _estadoPrevio: EstadoFormularioProducto,
  formData: FormData,
): Promise<EstadoFormularioProducto> {
  try {
    await reemplazarImagenProducto(productoId, formData);
  } catch (error) {
    return { error: mensajeDeAccion("reemplazarImagenProductoAction", error, "No pudimos reemplazar la imagen. Intenta de nuevo.") };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return { guardado: true };
}
