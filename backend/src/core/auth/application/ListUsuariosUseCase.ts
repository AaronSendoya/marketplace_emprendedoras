import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import type { FiltrosUsuarios, UsuarioConPerfil } from "../domain/Usuario";

export class ListUsuariosUseCase {
  constructor(private readonly usuarios: IUsuarioRepository) {}

  ejecutar(filtros: FiltrosUsuarios, pagina: ParametrosPagina): Promise<Pagina<UsuarioConPerfil>> {
    return this.usuarios.listar(filtros, pagina);
  }
}
