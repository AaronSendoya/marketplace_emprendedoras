import { obtenerJson } from "./cliente";
import type { FiltrosPromociones, PaginaPromociones, PromocionPublica } from "./tipos";

// GET /marketplace/promociones (regla 23, backend): público. Un descuento que rige ahora, de una cuenta activa y con productos activos. La
// vigencia se evalúa al consultar, así que se guarda poco (30 s, el valor por defecto del cliente). Con texto de búsqueda o con una
// semilla (orden al azar) no se cachea: cada visita trae la suya y guardarlas todas llenaría la caché de Next.
export const listarPromociones = (filtros: FiltrosPromociones = {}) =>
  obtenerJson<PaginaPromociones>("/marketplace/promociones", { parametros: { ...filtros }, revalidarSegundos: filtros.q || filtros.semilla ? 0 : undefined });

export const obtenerPromocion = (id: string) => obtenerJson<PromocionPublica>(`/marketplace/promociones/${id}`);
