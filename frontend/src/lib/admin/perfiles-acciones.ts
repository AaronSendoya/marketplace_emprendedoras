"use server";

import { revalidatePath } from "next/cache";
import { ErrorApi } from "@/lib/api/cliente";
import {
  crearPerfilAdmin,
  editarPerfilAdmin,
  reemplazarFotoPerfil,
  reemplazarLogo,
  type DatosEditarPerfil,
} from "@/lib/api/perfiles";

// Un solo tipo de estado para alta y edición (PerfilFormulario usa el mismo formulario y el mismo
// useActionState para las dos acciones, según haya o no perfil todavía).
export interface EstadoFormularioPerfil {
  error?: string;
  guardado?: boolean;
}

// Alta del perfil en nombre de una cuenta Emprendedor (regla 18, backend). El formulario ya manda
// `usuario_id` (campo oculto) y las imágenes como `multipart/form-data`: el FormData del envío se
// reenvía tal cual a crearPerfilAdmin, sin reconstruirlo campo por campo.
export async function crearPerfilAction(usuarioId: string, _estadoPrevio: EstadoFormularioPerfil, formData: FormData): Promise<EstadoFormularioPerfil> {
  try {
    await crearPerfilAdmin(formData);
  } catch (error) {
    if (error instanceof ErrorApi) {
      if (error.status === 409) return { error: "Esta cuenta ya tiene un perfil." };
      if (error.status === 400) return { error: error.message };
    }
    return { error: "No pudimos crear el perfil. Intenta de nuevo." };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  revalidatePath("/admin/emprendimientos");
  return { guardado: true };
}

// Editar los datos de texto de un perfil ya existente (regla 18). Las imágenes no pasan por acá:
// el backend las expone en sus propias rutas (reemplazarFotoPerfilAction, reemplazarLogoAction).
export async function editarPerfilAction(
  perfilId: string,
  usuarioId: string,
  _estadoPrevio: EstadoFormularioPerfil,
  formData: FormData,
): Promise<EstadoFormularioPerfil> {
  const nombreNegocio = String(formData.get("nombre_negocio") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const otraRedSocial = String(formData.get("otra_red_social") ?? "").trim();
  const ciudadId = String(formData.get("ciudad_id") ?? "").trim();
  const rubroId = String(formData.get("rubro_id") ?? "").trim();

  if (!nombreNegocio || !descripcion || !whatsapp || !ciudadId || !rubroId) {
    return { error: "Completa los campos obligatorios." };
  }

  const datos: DatosEditarPerfil = {
    nombre_negocio: nombreNegocio,
    descripcion,
    whatsapp,
    instagram: instagram || null,
    otra_red_social: otraRedSocial || null,
    ciudad_id: ciudadId,
    rubro_id: rubroId,
  };

  try {
    await editarPerfilAdmin(perfilId, datos);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 400) return { error: error.message };
    return { error: "No pudimos guardar los cambios. Intenta de nuevo." };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  revalidatePath("/admin/emprendimientos");
  return { guardado: true };
}

// PUT /perfiles/{id}/foto-perfil y PUT /perfiles/{id}/logo: cada imagen se reemplaza por separado,
// con su propio archivo o `usar_predeterminada=true` (campo "archivo" y, opcional, el checkbox
// "usar_predeterminada" del formulario).
export async function reemplazarFotoPerfilAction(
  perfilId: string,
  usuarioId: string,
  _estadoPrevio: EstadoFormularioPerfil,
  formData: FormData,
): Promise<EstadoFormularioPerfil> {
  try {
    await reemplazarFotoPerfil(perfilId, formData);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 400) return { error: error.message };
    return { error: "No pudimos reemplazar la foto de perfil. Intenta de nuevo." };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return { guardado: true };
}

export async function reemplazarLogoAction(
  perfilId: string,
  usuarioId: string,
  _estadoPrevio: EstadoFormularioPerfil,
  formData: FormData,
): Promise<EstadoFormularioPerfil> {
  try {
    await reemplazarLogo(perfilId, formData);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 400) return { error: error.message };
    return { error: "No pudimos reemplazar el logo. Intenta de nuevo." };
  }

  revalidatePath(`/admin/emprendimientos/${usuarioId}`);
  return { guardado: true };
}
