import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { CambiosDescuento, Descuento, NuevoDescuento } from "./Descuento";

// Un descuento nunca se borra (regla 8): no hay `eliminar`. Se termina editando `fecha_fin`.
export interface IDescuentoRepository {
  // Lanza ErrorValidacion si el perfil no existe.
  crear(datos: NuevoDescuento): Promise<Descuento>;
  buscarPorId(id: string): Promise<Descuento | null>;
  actualizar(id: string, cambios: CambiosDescuento): Promise<void>;
  // Más recientes primero, con los ids de los productos asignados.
  listarPorPerfil(perfilId: string, pagina: ParametrosPagina): Promise<Pagina<Descuento>>;
  // Idempotente: si ya estaba asignado, no hace nada. El caso de uso ya validó el perfil (regla 9).
  asignar(descuentoId: string, productoIds: string[]): Promise<void>;
  // Idempotente: quitar una asignación que no existe no falla.
  quitar(descuentoId: string, productoId: string): Promise<void>;
}
