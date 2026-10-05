"use server";

import { redirect } from "next/navigation";
import {
  crearPerfilAction,
  editarPerfilAction,
  reemplazarFotoPerfilAction,
  reemplazarLogoAction,
  type EstadoFormularioPerfil,
} from "@/lib/admin/perfiles-acciones";
import { obtenerMe } from "@/lib/api/auth";
import { refrescarNegocio } from "./refrescar";
import { PARAMETROS_NEGOCIO, RUTAS_NEGOCIO } from "./rutas";

// Acciones del panel de la Emprendedora sobre su propio perfil. Reutilizan la lógica de las del
// Admin (lectura del formulario, mensajes de error, llamada al backend): las reglas del formulario
// no pueden divergir entre los dos paneles. Lo único propio es qué pantallas se refrescan y a
// dónde se vuelve; el `usuarioId` que reciben las del Admin solo les sirve para revalidar rutas.

export async function crearPerfilNegocioAction(estadoPrevio: EstadoFormularioPerfil, formData: FormData): Promise<EstadoFormularioPerfil> {
  const yo = await obtenerMe();
  const estado = await crearPerfilAction(yo.id, estadoPrevio, formData);
  if (!estado.guardado) return estado;

  refrescarNegocio();
  redirect(RUTAS_NEGOCIO.inicio);
}

export async function editarPerfilNegocioAction(
  perfilId: string,
  estadoPrevio: EstadoFormularioPerfil,
  formData: FormData,
): Promise<EstadoFormularioPerfil> {
  const yo = await obtenerMe();
  const estado = await editarPerfilAction(perfilId, yo.id, estadoPrevio, formData);
  if (!estado.guardado) return estado;

  refrescarNegocio();
  redirect(`${RUTAS_NEGOCIO.perfil}?${PARAMETROS_NEGOCIO.perfilGuardado}=1`);
}

export async function reemplazarFotoNegocioAction(
  perfilId: string,
  estadoPrevio: EstadoFormularioPerfil,
  formData: FormData,
): Promise<EstadoFormularioPerfil> {
  const yo = await obtenerMe();
  const estado = await reemplazarFotoPerfilAction(perfilId, yo.id, estadoPrevio, formData);
  if (estado.guardado) refrescarNegocio();
  return estado;
}

export async function reemplazarLogoNegocioAction(
  perfilId: string,
  estadoPrevio: EstadoFormularioPerfil,
  formData: FormData,
): Promise<EstadoFormularioPerfil> {
  const yo = await obtenerMe();
  const estado = await reemplazarLogoAction(perfilId, yo.id, estadoPrevio, formData);
  if (estado.guardado) refrescarNegocio();
  return estado;
}
