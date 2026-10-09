import { ok, paginado } from "@/api/http/respuestas";
import type { GetPromocionesUseCase, GetPromocionUseCase } from "@/core/descuentos/application/ConsultasPromocion";
import type { FiltrosPromociones, PromocionPublica } from "@/core/descuentos/domain/Promocion";
import type { ParametrosPagina } from "@/shared/domain/Paginacion";
import type { UrlImagen } from "./perfiles.controller";

// Regla 23: lo que ve cualquier visitante de una promoción. Lista explícita de campos: nunca el id de la cuenta ni claves de R2.
export function serializarPromocion(promocion: PromocionPublica, urlImagen: UrlImagen) {
  return {
    id: promocion.id,
    porcentaje: promocion.porcentaje,
    descripcion: promocion.descripcion,
    fecha_inicio: promocion.fechaInicio?.toISOString() ?? null,
    fecha_fin: promocion.fechaFin?.toISOString() ?? null,
    productos_total: promocion.productosTotal,
    productos_muestra: promocion.productosMuestra.map(urlImagen),
    perfil: {
      id: promocion.perfil.id,
      nombre_negocio: promocion.perfil.nombreNegocio,
      whatsapp: promocion.perfil.whatsapp,
      ciudad: promocion.perfil.ciudad,
      rubro: promocion.perfil.rubro,
      logo_url: urlImagen(promocion.perfil.logoKey),
    },
  };
}

export async function listarPromociones(
  usecase: GetPromocionesUseCase,
  filtros: FiltrosPromociones,
  pagina: ParametrosPagina,
  urlImagen: UrlImagen,
): Promise<Response> {
  const resultado = await usecase.ejecutar(filtros, pagina);
  return paginado({ ...resultado, datos: resultado.datos.map((promocion) => serializarPromocion(promocion, urlImagen)) }, pagina);
}

export async function obtenerPromocion(usecase: GetPromocionUseCase, id: string, urlImagen: UrlImagen): Promise<Response> {
  return ok(serializarPromocion(await usecase.ejecutar(id), urlImagen));
}
