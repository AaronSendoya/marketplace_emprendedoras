import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { FiltrosPromociones, PromocionPublica } from "./Promocion";

// Lectura pública de las promociones (regla 23). `ahora` (UTC) se pasa siempre, como en el feed de productos: la vigencia no
// depende del reloj del servidor de la base y se prueba con un reloj falso (regla 8).
export interface IPromocionRepository {
  // Solo las promociones que rigen en `ahora`, de cuentas activas y con al menos un producto activo, en el orden pedido.
  listarPublicas(ahora: Date, filtros: FiltrosPromociones, pagina: ParametrosPagina): Promise<Pagina<PromocionPublica>>;
  // La promoción con ese id si cumple lo mismo; si no, `null`.
  buscarPublicaPorId(ahora: Date, id: string): Promise<PromocionPublica | null>;
}
