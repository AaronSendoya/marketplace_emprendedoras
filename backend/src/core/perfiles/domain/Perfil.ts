import type { Actor } from "@/shared/domain/Actor";

export interface ReferenciaCatalogo {
  id: string;
  nombre: string;
}

export interface Perfil {
  id: string;
  usuarioId: string;
  // Si la cuenta está desactivada, el perfil no se muestra en el catálogo (regla 18).
  usuarioActivo: boolean;
  // Derivado de la cuenta (regla 10); el correo nunca se incluye (regla 17).
  nombreEmprendedora: string;
  nombreNegocio: string;
  descripcion: string;
  whatsapp: string;
  instagramUsername: string | null;
  otraRedSocial: string | null;
  ciudad: ReferenciaCatalogo;
  rubro: ReferenciaCatalogo;
  fotoPerfilKey: string;
  logoKey: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface NuevoPerfil {
  usuarioId: string;
  nombreNegocio: string;
  descripcion: string;
  whatsapp: string;
  instagramUsername: string | null;
  otraRedSocial: string | null;
  ciudadId: string;
  rubroId: string;
  fotoPerfilKey: string;
  logoKey: string;
  ahora: Date;
}

export interface CambiosPerfil {
  nombreNegocio?: string;
  descripcion?: string;
  whatsapp?: string;
  instagramUsername?: string | null;
  otraRedSocial?: string | null;
  ciudadId?: string;
  rubroId?: string;
  fotoPerfilKey?: string;
  logoKey?: string;
}

export interface FiltrosPerfiles {
  ciudadId?: string;
  rubroId?: string;
  // Texto libre: se busca en el nombre del negocio y en la descripción.
  q?: string;
}

export type { Actor };

// Regla 18: la emprendedora gestiona solo su perfil; el Admin, el de cualquiera.
export const puedeGestionarPerfil = (actor: Actor, perfil: Pick<Perfil, "usuarioId">) =>
  actor.rol === "Admin" || perfil.usuarioId === actor.id;
