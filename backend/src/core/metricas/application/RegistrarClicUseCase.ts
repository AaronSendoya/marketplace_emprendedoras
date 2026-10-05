import type { IPerfilRepository } from "@/core/perfiles/domain/IPerfilRepository";
import { ErrorNoEncontrado } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { TipoClic } from "../domain/Clic";
import type { IClicRepository } from "../domain/IClicRepository";

// Público, sin autenticar (regla 19): cualquier visitante del catálogo dispara esto al hacer clic
// en WhatsApp o Instagram. Mismo criterio de visibilidad que el resto del catálogo (regla 18): un
// perfil inexistente o de una cuenta desactivada se ve como inexistente.
export class RegistrarClicUseCase {
  constructor(
    private readonly perfiles: Pick<IPerfilRepository, "buscarPorId">,
    private readonly clics: IClicRepository,
    private readonly clock: IClock,
  ) {}

  async ejecutar(perfilId: string, tipo: TipoClic): Promise<void> {
    const perfil = await this.perfiles.buscarPorId(perfilId);
    if (!perfil?.usuarioActivo) throw new ErrorNoEncontrado("El perfil no existe.");
    await this.clics.registrar(perfilId, tipo, this.clock.ahora());
  }
}
