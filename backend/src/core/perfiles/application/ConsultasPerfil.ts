import { ErrorNoEncontrado } from "@/shared/domain/errors";
import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { IPerfilRepository } from "../domain/IPerfilRepository";
import type { FiltrosPerfiles, Perfil } from "../domain/Perfil";

// Feed 1 (público): solo perfiles de cuentas activas (regla 18).
export class GetPerfilesUseCase {
  constructor(private readonly perfiles: IPerfilRepository) {}

  ejecutar(filtros: FiltrosPerfiles, pagina: ParametrosPagina): Promise<Pagina<Perfil>> {
    return this.perfiles.listar(filtros, pagina);
  }
}

// Un perfil de una cuenta desactivada se ve como inexistente (regla 18).
export class GetPerfilUseCase {
  constructor(private readonly perfiles: IPerfilRepository) {}

  async ejecutar(id: string): Promise<Perfil> {
    const perfil = await this.perfiles.buscarPorId(id);
    if (!perfil?.usuarioActivo) throw new ErrorNoEncontrado("El perfil no existe.");
    return perfil;
  }
}

export class GetMiPerfilUseCase {
  constructor(private readonly perfiles: IPerfilRepository) {}

  async ejecutar(usuarioId: string): Promise<Perfil> {
    const perfil = await this.perfiles.buscarPorUsuarioId(usuarioId);
    if (!perfil) throw new ErrorNoEncontrado("Todavía no tienes un perfil.");
    return perfil;
  }
}
