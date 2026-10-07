import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { ProductoBuscable } from "./BusquedaSimilar";
import type { CambiosProducto, FiltrosMarketplace, NuevoProducto, Producto } from "./Producto";

// `ahora` (UTC) se pasa siempre: la vigencia de los descuentos no depende del reloj del servidor de
// la base y se prueba con un reloj falso (regla 8).
export interface IProductoRepository {
  // Lanza ErrorValidacion si el perfil no existe.
  crear(datos: NuevoProducto): Promise<Producto>;
  // Incluye productos inactivos y de cuentas desactivadas: el caso de uso decide qué se ve.
  buscarPorId(id: string, ahora: Date): Promise<Producto | null>;
  actualizar(id: string, cambios: CambiosProducto, ahora: Date): Promise<void>;
  // Feed 2: solo productos activos de cuentas activas, más recientes primero.
  listarMarketplace(ahora: Date, filtros: FiltrosMarketplace, pagina: ParametrosPagina): Promise<Pagina<Producto>>;
  // Para la búsqueda de resultados similares (regla 21): los textos de los productos activos de cuentas activas que
  // cumplen perfil, ciudad y rubro, sin filtrar por el texto buscado, con el límite de `BusquedaSimilar`.
  textosBuscables(filtros: Pick<FiltrosMarketplace, "perfilId" | "ciudadId" | "rubroId">): Promise<ProductoBuscable[]>;
  // Los productos del feed (activos, de cuentas activas) con esos ids, en el mismo orden y con su descuento vigente
  // (regla 8): un id que no existe, está inactivo o es de una cuenta desactivada (regla 18) no aparece.
  listarMarketplacePorIds(ahora: Date, ids: string[]): Promise<Producto[]>;
  // Todos los productos del perfil, activos o no ("mis productos").
  listarPorPerfil(perfilId: string, ahora: Date, pagina: ParametrosPagina): Promise<Pagina<Producto>>;
}
