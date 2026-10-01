import type { IPerfilRepository } from "@/core/perfiles/domain/IPerfilRepository";
import { ErrorNoEncontrado } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { IProductoRepository } from "../domain/IProductoRepository";
import type { FiltrosMarketplace, Producto } from "../domain/Producto";

// Feed 2 (público, regla 8): productos activos de cuentas activas, con el mayor descuento vigente
// y el precio con descuento calculados al consultar, sin tareas programadas.
export class GetMarketplaceUseCase {
  constructor(
    private readonly productos: IProductoRepository,
    private readonly clock: IClock,
  ) {}

  ejecutar(filtros: FiltrosMarketplace, pagina: ParametrosPagina): Promise<Pagina<Producto>> {
    return this.productos.listarMarketplace(this.clock.ahora(), filtros, pagina);
  }
}

// Un producto inactivo o de una cuenta desactivada se ve como inexistente (regla 18).
export class GetProductoMarketplaceUseCase {
  constructor(
    private readonly productos: IProductoRepository,
    private readonly clock: IClock,
  ) {}

  async ejecutar(id: string): Promise<Producto> {
    const producto = await this.productos.buscarPorId(id, this.clock.ahora());
    if (!producto?.activo || !producto.perfil.usuarioActivo) throw new ErrorNoEncontrado("El producto no existe.");
    return producto;
  }
}

// "Mis productos": los de su perfil, activos o no. Sin perfil (una cuenta nueva o un Admin) la lista
// está vacía, no es un error.
export class ListMisProductosUseCase {
  constructor(
    private readonly productos: IProductoRepository,
    private readonly perfiles: Pick<IPerfilRepository, "buscarPorUsuarioId">,
    private readonly clock: IClock,
  ) {}

  async ejecutar(usuarioId: string, pagina: ParametrosPagina): Promise<Pagina<Producto>> {
    const perfil = await this.perfiles.buscarPorUsuarioId(usuarioId);
    if (!perfil) return { datos: [], total: 0 };
    return this.productos.listarPorPerfil(perfil.id, this.clock.ahora(), pagina);
  }
}
