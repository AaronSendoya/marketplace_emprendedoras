import {
  actualizarJsonAutenticado,
  enviarFormDataAutenticado,
  ErrorApi,
  obtenerJson,
  obtenerJsonAutenticado,
  reemplazarFormDataAutenticado,
} from "./cliente";
import type { FiltrosPerfiles, Pagina, Perfil } from "./tipos";

// GET /perfiles: Feed 1 (emprendedoras), público. Regla 8 (backend): no cachear más tiempo del
// retraso tolerable; 30 s por defecto (mismo criterio que el marketplace, aunque los perfiles no
// tengan vigencia de descuentos, para mantener un solo valor fácil de ajustar).
export const listarPerfiles = (filtros: FiltrosPerfiles = {}) =>
  obtenerJson<Pagina<Perfil>>("/perfiles", { parametros: { ...filtros } });

export const obtenerPerfil = (id: string) => obtenerJson<Perfil>(`/perfiles/${id}`);

// GET /admin/usuarios/{id}/perfil (módulo "Emprendimientos"): `null` cuando la cuenta todavía no
// tiene perfil, para que la pantalla decida entre el formulario de alta o el de edición, en vez de
// propagar el 404 como un error de carga de la página.
export async function obtenerPerfilDeUsuario(usuarioId: string): Promise<Perfil | null> {
  try {
    return await obtenerJsonAutenticado<Perfil>(`/admin/usuarios/${usuarioId}/perfil`);
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 404) return null;
    throw error;
  }
}

// POST /perfiles (multipart/form-data): alta en nombre de una cuenta Emprendedor. El propio
// FormData ya trae `usuario_id`, los campos de texto y las imágenes (archivo o
// `usar_foto_predeterminada`/`usar_logo_predeterminado`), armados por el formulario del panel.
export const crearPerfilAdmin = (formData: FormData) => enviarFormDataAutenticado<Perfil>("/perfiles", formData);

export interface DatosEditarPerfil {
  nombre_negocio?: string;
  descripcion?: string;
  whatsapp?: string;
  instagram?: string | null;
  otra_red_social?: string | null;
  ciudad_id?: string;
  rubro_id?: string;
}

// PATCH /perfiles/{id}: cambia solo los campos de texto; las imágenes tienen sus propias rutas
// (reemplazarFotoPerfil, reemplazarLogo) porque así las expone el backend.
export const editarPerfilAdmin = (perfilId: string, datos: DatosEditarPerfil) =>
  actualizarJsonAutenticado<Perfil>(`/perfiles/${perfilId}`, datos);

// PUT /perfiles/{id}/foto-perfil, PUT /perfiles/{id}/logo (multipart/form-data): reemplazan una
// sola imagen a la vez, independiente de los datos de texto del perfil.
export const reemplazarFotoPerfil = (perfilId: string, formData: FormData) =>
  reemplazarFormDataAutenticado<Perfil>(`/perfiles/${perfilId}/foto-perfil`, formData);

export const reemplazarLogo = (perfilId: string, formData: FormData) =>
  reemplazarFormDataAutenticado<Perfil>(`/perfiles/${perfilId}/logo`, formData);
