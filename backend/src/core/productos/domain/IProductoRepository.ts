import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
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
  // Todos los productos del perfil, activos o no ("mis productos").
  listarPorPerfil(perfilId: string, ahora: Date, pagina: ParametrosPagina): Promise<Pagina<Producto>>;
}
