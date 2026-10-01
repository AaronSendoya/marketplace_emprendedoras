import type { IUsuarioRepository } from "@/core/auth/domain/IUsuarioRepository";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { IImageProcessor } from "@/shared/domain/IImageProcessor";
import type { IImageStorage } from "@/shared/domain/IImageStorage";
import type { ILogger } from "@/shared/domain/ILogger";
import type { ImagenEntrante } from "@/shared/domain/imagenes";
import { normalizarInstagram } from "../domain/Instagram";
import { normalizarOtraRedSocial } from "../domain/OtraRedSocial";
import type { IPerfilRepository } from "../domain/IPerfilRepository";
import type { Actor, Perfil } from "../domain/Perfil";
import { normalizarWhatsapp } from "../domain/Whatsapp";
import { prepararImagen } from "./prepararImagen";

export interface DatosNuevoPerfil {
  // Solo lo indica un Admin (crea el perfil en nombre de una cuenta); una emprendedora crea el suyo.
  usuarioId?: string;
  nombreNegocio: string;
  descripcion: string;
  // Tal como lo escribió la persona; el caso de uso lo normaliza (reglas 2 y 3).
  whatsapp: string;
  instagram?: string | null;
  otraRedSocial?: string | null;
  ciudadId: string;
  rubroId: string;
  foto: ImagenEntrante;
  logo: ImagenEntrante;
}

export class CreatePerfilUseCase {
  constructor(
    private readonly perfiles: IPerfilRepository,
    private readonly usuarios: Pick<IUsuarioRepository, "buscarPorId">,
    private readonly procesador: IImageProcessor,
    private readonly almacenamiento: IImageStorage,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, datos: DatosNuevoPerfil): Promise<Perfil> {
    const usuarioId = await this.resolverDueno(actor, datos.usuarioId);
    const whatsapp = normalizarWhatsapp(datos.whatsapp);
    const instagramUsername = normalizarInstagram(datos.instagram);
    const otraRedSocial = normalizarOtraRedSocial(datos.otraRedSocial);
    if (await this.perfiles.buscarPorUsuarioId(usuarioId)) throw new ErrorConflicto("Este usuario ya tiene un perfil.");

    // Se procesan las dos antes de subir cualquiera: si una es inválida no queda nada subido.
    const foto = await prepararImagen(this.procesador, datos.foto, "perfil");
    const logo = await prepararImagen(this.procesador, datos.logo, "logo");

    const subidas: string[] = [];
    try {
      for (const imagen of [foto, logo]) {
        if (!imagen.contenido) continue;
        await this.almacenamiento.guardar(imagen.clave, imagen.contenido);
        subidas.push(imagen.clave);
      }
      const perfil = await this.perfiles.crear({
        usuarioId,
        nombreNegocio: datos.nombreNegocio,
        descripcion: datos.descripcion,
        whatsapp,
        instagramUsername,
        otraRedSocial,
        ciudadId: datos.ciudadId,
        rubroId: datos.rubroId,
        fotoPerfilKey: foto.clave,
        logoKey: logo.clave,
        ahora: this.clock.ahora(),
      });
      this.logger.info("perfil_creado", { perfilId: perfil.id, usuarioId, actorId: actor.id });
      return perfil;
    } catch (error) {
      // Si falla el alta (p. ej. la ciudad no existe), se borran las imágenes ya subidas.
      await Promise.all(subidas.map((clave) => this.almacenamiento.borrar(clave).catch(() => undefined)));
      throw error;
    }
  }

  private async resolverDueno(actor: Actor, usuarioIdIndicado: string | undefined): Promise<string> {
    if (actor.rol === "Admin") {
      if (!usuarioIdIndicado) {
        const mensaje = "Indica la cuenta a la que pertenece el perfil.";
        throw new ErrorValidacion(mensaje, [{ campo: "usuario_id", mensaje }]);
      }
      const usuario = await this.usuarios.buscarPorId(usuarioIdIndicado);
      if (!usuario) throw new ErrorNoEncontrado("La cuenta no existe.");
      if (usuario.rol !== "Emprendedor") {
        const mensaje = "Solo las cuentas Emprendedor tienen perfil.";
        throw new ErrorValidacion(mensaje, [{ campo: "usuario_id", mensaje }]);
      }
      return usuario.id;
    }
    if (usuarioIdIndicado && usuarioIdIndicado !== actor.id) throw new ErrorProhibido("Solo puedes crear tu propio perfil.");
    return actor.id;
  }
}
