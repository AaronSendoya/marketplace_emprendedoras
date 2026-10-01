import { ErrorNoEncontrado, ErrorProhibido } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { IImageProcessor } from "@/shared/domain/IImageProcessor";
import type { IImageStorage } from "@/shared/domain/IImageStorage";
import type { ILogger } from "@/shared/domain/ILogger";
import { esImagenPredeterminada, type ImagenEntrante } from "@/shared/domain/imagenes";
import type { IPerfilRepository } from "../domain/IPerfilRepository";
import { puedeGestionarPerfil, type Actor, type Perfil } from "../domain/Perfil";
import { prepararImagen } from "./prepararImagen";

export type ImagenDePerfil = "perfil" | "logo";

// Regla 6: un perfil tiene una sola foto y un solo logo; reemplazar uno no toca el otro (regla 11).
export class ReemplazarImagenPerfilUseCase {
  constructor(
    private readonly perfiles: IPerfilRepository,
    private readonly procesador: IImageProcessor,
    private readonly almacenamiento: IImageStorage,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, perfilId: string, cual: ImagenDePerfil, imagen: ImagenEntrante): Promise<Perfil> {
    const perfil = await this.perfiles.buscarPorId(perfilId);
    if (!perfil) throw new ErrorNoEncontrado("El perfil no existe.");
    if (!puedeGestionarPerfil(actor, perfil)) throw new ErrorProhibido("Solo puedes editar tu propio perfil.");

    const claveAnterior = cual === "perfil" ? perfil.fotoPerfilKey : perfil.logoKey;
    const nueva = await prepararImagen(this.procesador, imagen, cual);
    if (nueva.contenido) await this.almacenamiento.guardar(nueva.clave, nueva.contenido);

    try {
      await this.perfiles.actualizar(
        perfilId,
        cual === "perfil" ? { fotoPerfilKey: nueva.clave } : { logoKey: nueva.clave },
        this.clock.ahora(),
      );
    } catch (error) {
      if (nueva.contenido) await this.almacenamiento.borrar(nueva.clave).catch(() => undefined);
      throw error;
    }

    // La anterior se borra después de guardar el cambio, para no dejar el perfil sin imagen. Una
    // predeterminada es compartida y nunca se borra.
    if (claveAnterior !== nueva.clave && !esImagenPredeterminada(claveAnterior)) {
      await this.almacenamiento
        .borrar(claveAnterior)
        .catch((error: unknown) => this.logger.warn("imagen_anterior_no_borrada", { error }));
    }
    this.logger.info("perfil_imagen_reemplazada", { perfilId, actorId: actor.id, imagen: cual });

    const actualizado = await this.perfiles.buscarPorId(perfilId);
    if (!actualizado) throw new ErrorNoEncontrado("El perfil no existe.");
    return actualizado;
  }
}
