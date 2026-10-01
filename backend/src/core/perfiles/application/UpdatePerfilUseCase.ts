import { ErrorNoEncontrado, ErrorProhibido } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { ILogger } from "@/shared/domain/ILogger";
import { normalizarInstagram } from "../domain/Instagram";
import { normalizarOtraRedSocial } from "../domain/OtraRedSocial";
import type { IPerfilRepository } from "../domain/IPerfilRepository";
import { puedeGestionarPerfil, type Actor, type CambiosPerfil, type Perfil } from "../domain/Perfil";
import { normalizarWhatsapp } from "../domain/Whatsapp";

export interface DatosEdicionPerfil {
  nombreNegocio?: string;
  descripcion?: string;
  whatsapp?: string;
  // null quita el Instagram.
  instagram?: string | null;
  // null quita la otra red social.
  otraRedSocial?: string | null;
  ciudadId?: string;
  rubroId?: string;
}

export class UpdatePerfilUseCase {
  constructor(
    private readonly perfiles: IPerfilRepository,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, perfilId: string, datos: DatosEdicionPerfil): Promise<Perfil> {
    const perfil = await this.perfiles.buscarPorId(perfilId);
    if (!perfil) throw new ErrorNoEncontrado("El perfil no existe.");
    if (!puedeGestionarPerfil(actor, perfil)) throw new ErrorProhibido("Solo puedes editar tu propio perfil.");

    const cambios: CambiosPerfil = {
      nombreNegocio: datos.nombreNegocio,
      descripcion: datos.descripcion,
      whatsapp: datos.whatsapp === undefined ? undefined : normalizarWhatsapp(datos.whatsapp),
      instagramUsername: datos.instagram === undefined ? undefined : normalizarInstagram(datos.instagram),
      otraRedSocial: datos.otraRedSocial === undefined ? undefined : normalizarOtraRedSocial(datos.otraRedSocial),
      ciudadId: datos.ciudadId,
      rubroId: datos.rubroId,
    };
    await this.perfiles.actualizar(perfilId, cambios, this.clock.ahora());
    this.logger.info("perfil_actualizado", { perfilId, actorId: actor.id });

    const actualizado = await this.perfiles.buscarPorId(perfilId);
    if (!actualizado) throw new ErrorNoEncontrado("El perfil no existe.");
    return actualizado;
  }
}
