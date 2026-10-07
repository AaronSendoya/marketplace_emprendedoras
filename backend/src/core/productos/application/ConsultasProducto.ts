import type { IPerfilRepository } from "@/core/perfiles/domain/IPerfilRepository";
import { ErrorNoEncontrado } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import { ordenarPorSimilitud } from "../domain/BusquedaSimilar";
import type { IProductoRepository } from "../domain/IProductoRepository";
import type { FiltrosMarketplace, Producto } from "../domain/Producto";

// `similares`: los productos no son coincidencias exactas del texto buscado sino parecidos (regla 21).
export interface ResultadoProductos extends Pagina<Producto> {
  similares: boolean;
}

// Feed 2 (público, regla 8): productos activos de cuentas activas, con el mayor descuento vigente
// y el precio con descuento calculados al consultar, sin tareas programadas.
export class GetMarketplaceUseCase {
  constructor(
    private readonly productos: IProductoRepository,
    private readonly clock: IClock,
  ) {}

  // Regla 21: con texto de búsqueda y ninguna coincidencia exacta, se devuelven los productos parecidos, con su
  // descuento vigente. Con al menos una coincidencia exacta solo se devuelven las exactas: lo parecido nunca se mezcla
  // con ellas.
  async ejecutar(filtros: FiltrosMarketplace, pagina: ParametrosPagina): Promise<ResultadoProductos> {
    const ahora = this.clock.ahora();
    const exactos = await this.productos.listarMarketplace(ahora, filtros, pagina);
    if (exactos.total > 0 || !filtros.q) return { ...exactos, similares: false };

    const candidatos = await this.productos.textosBuscables({ perfilId: filtros.perfilId, ciudadId: filtros.ciudadId, rubroId: filtros.rubroId });
    const ids = ordenarPorSimilitud(filtros.q, candidatos);
    const desde = desplazamiento(pagina);
    const datos = await this.productos.listarMarketplacePorIds(ahora, ids.slice(desde, desde + pagina.limite));
    return { datos, total: ids.length, similares: ids.length > 0 };
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
