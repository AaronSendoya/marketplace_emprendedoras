import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { CambiosPerfil, FiltrosPerfiles, NuevoPerfil, Perfil } from "./Perfil";

export interface IPerfilRepository {
  // Lanza ErrorConflicto si el usuario ya tiene perfil y ErrorValidacion si la ciudad o el rubro no existen.
  crear(datos: NuevoPerfil): Promise<Perfil>;
  // Incluye perfiles de cuentas desactivadas (`usuarioActivo` lo indica): el caso de uso decide.
  buscarPorId(id: string): Promise<Perfil | null>;
  buscarPorUsuarioId(usuarioId: string): Promise<Perfil | null>;
  // Lanza ErrorValidacion si la ciudad o el rubro no existen.
  actualizar(id: string, cambios: CambiosPerfil, ahora: Date): Promise<void>;
  // Solo perfiles de cuentas activas (regla 18), en un orden estable: más recientes primero.
  listar(filtros: FiltrosPerfiles, pagina: ParametrosPagina): Promise<Pagina<Perfil>>;
}
