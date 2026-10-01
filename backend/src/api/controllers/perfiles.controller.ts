import { creado, ok, paginado } from "@/api/http/respuestas";
import type {
  GetMiPerfilUseCase,
  GetPerfilesUseCase,
  GetPerfilUseCase,
} from "@/core/perfiles/application/ConsultasPerfil";
import type { CreatePerfilUseCase, DatosNuevoPerfil } from "@/core/perfiles/application/CreatePerfilUseCase";
import type { ImagenDePerfil, ReemplazarImagenPerfilUseCase } from "@/core/perfiles/application/ReemplazarImagenPerfilUseCase";
import type { DatosEdicionPerfil, UpdatePerfilUseCase } from "@/core/perfiles/application/UpdatePerfilUseCase";
import type { Actor, FiltrosPerfiles, Perfil } from "@/core/perfiles/domain/Perfil";
import type { ImagenEntrante } from "@/shared/domain/imagenes";
import type { ParametrosPagina } from "@/shared/domain/Paginacion";

// Convierte la clave guardada en la URL pública (regla 16): el frontend nunca ve claves.
export type UrlImagen = (clave: string) => string;

// Lista explícita: nunca sale el id de la cuenta ni el correo (regla 17).
export function serializarPerfil(perfil: Perfil, urlImagen: UrlImagen) {
  return {
    id: perfil.id,
    nombre_negocio: perfil.nombreNegocio,
    descripcion: perfil.descripcion,
    whatsapp: perfil.whatsapp,
    instagram_username: perfil.instagramUsername,
    otra_red_social: perfil.otraRedSocial,
    ciudad: perfil.ciudad,
    rubro: perfil.rubro,
    emprendedora: perfil.nombreEmprendedora,
    foto_perfil_url: urlImagen(perfil.fotoPerfilKey),
    logo_url: urlImagen(perfil.logoKey),
    creado_en: perfil.creadoEn.toISOString(),
    actualizado_en: perfil.actualizadoEn.toISOString(),
  };
}

export async function listarPerfiles(
  usecase: GetPerfilesUseCase,
  filtros: FiltrosPerfiles,
  pagina: ParametrosPagina,
  urlImagen: UrlImagen,
): Promise<Response> {
  const resultado = await usecase.ejecutar(filtros, pagina);
  return paginado({ ...resultado, datos: resultado.datos.map((perfil) => serializarPerfil(perfil, urlImagen)) }, pagina);
}

export async function obtenerPerfil(usecase: GetPerfilUseCase, id: string, urlImagen: UrlImagen): Promise<Response> {
  return ok(serializarPerfil(await usecase.ejecutar(id), urlImagen));
}

export async function obtenerMiPerfil(usecase: GetMiPerfilUseCase, usuarioId: string, urlImagen: UrlImagen): Promise<Response> {
  return ok(serializarPerfil(await usecase.ejecutar(usuarioId), urlImagen));
}

export async function crearPerfil(
  usecase: CreatePerfilUseCase,
  actor: Actor,
  datos: DatosNuevoPerfil,
  urlImagen: UrlImagen,
): Promise<Response> {
  return creado(serializarPerfil(await usecase.ejecutar(actor, datos), urlImagen));
}

export async function editarPerfil(
  usecase: UpdatePerfilUseCase,
  actor: Actor,
  perfilId: string,
  datos: DatosEdicionPerfil,
  urlImagen: UrlImagen,
): Promise<Response> {
  return ok(serializarPerfil(await usecase.ejecutar(actor, perfilId, datos), urlImagen));
}

export async function reemplazarImagenPerfil(
  usecase: ReemplazarImagenPerfilUseCase,
  actor: Actor,
  perfilId: string,
  cual: ImagenDePerfil,
  imagen: ImagenEntrante,
  urlImagen: UrlImagen,
): Promise<Response> {
  return ok(serializarPerfil(await usecase.ejecutar(actor, perfilId, cual, imagen), urlImagen));
}
