import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { PerfilBuscable } from "./BusquedaSimilar";
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
  // Para la búsqueda de resultados similares (regla 20): los textos de los perfiles activos que cumplen ciudad y
  // rubro, sin filtrar por el texto buscado, con los límites de `BusquedaSimilar`.
  textosBuscables(filtros: Pick<FiltrosPerfiles, "ciudadId" | "rubroId">): Promise<PerfilBuscable[]>;
  // Los perfiles de cuentas activas con esos ids, en el mismo orden (un id que no existe o es de una cuenta
  // desactivada, regla 18, no aparece).
  listarPorIds(ids: string[]): Promise<Perfil[]>;
}
