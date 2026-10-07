import { ErrorNoEncontrado } from "@/shared/domain/errors";
import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import { ordenarPorSimilitud } from "../domain/BusquedaSimilar";
import type { IPerfilRepository } from "../domain/IPerfilRepository";
import type { FiltrosPerfiles, Perfil } from "../domain/Perfil";

// `similares`: los perfiles no son coincidencias exactas del texto buscado sino parecidos (regla 20).
export interface ResultadoPerfiles extends Pagina<Perfil> {
  similares: boolean;
}

// Feed 1 (público): solo perfiles de cuentas activas (regla 18).
export class GetPerfilesUseCase {
  constructor(private readonly perfiles: IPerfilRepository) {}

  // Regla 20: con texto de búsqueda y ninguna coincidencia exacta, se devuelven los perfiles parecidos. Con al menos
  // una coincidencia exacta solo se devuelven las exactas: lo parecido nunca se mezcla con ellas.
  async ejecutar(filtros: FiltrosPerfiles, pagina: ParametrosPagina): Promise<ResultadoPerfiles> {
    const exactos = await this.perfiles.listar(filtros, pagina);
    if (exactos.total > 0 || !filtros.q) return { ...exactos, similares: false };

    const candidatos = await this.perfiles.textosBuscables({ ciudadId: filtros.ciudadId, rubroId: filtros.rubroId });
    const ids = ordenarPorSimilitud(filtros.q, candidatos);
    const desde = desplazamiento(pagina);
    const datos = await this.perfiles.listarPorIds(ids.slice(desde, desde + pagina.limite));
    return { datos, total: ids.length, similares: ids.length > 0 };
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
