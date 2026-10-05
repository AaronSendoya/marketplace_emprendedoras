import { ok, sinContenido } from "@/api/http/respuestas";
import type {
  EntradaRango,
  ObtenerClicsPorRubroUseCase,
  ObtenerMapaCalorClicsUseCase,
  ObtenerRankingClicsUseCase,
  ObtenerResumenClicsUseCase,
  ObtenerSerieClicsUseCase,
} from "@/core/metricas/application/ObtenerMetricasUseCase";
import type { RegistrarClicUseCase } from "@/core/metricas/application/RegistrarClicUseCase";
import type { OrdenMapaCalor, TipoClic } from "@/core/metricas/domain/Clic";

export async function registrarClic(usecase: RegistrarClicUseCase, perfilId: string, tipo: TipoClic): Promise<Response> {
  await usecase.ejecutar(perfilId, tipo);
  return sinContenido();
}

export async function obtenerResumenClics(usecase: ObtenerResumenClicsUseCase, rango: EntradaRango): Promise<Response> {
  return ok(await usecase.ejecutar(rango));
}

export async function obtenerRankingClics(usecase: ObtenerRankingClicsUseCase, limite: number, rango: EntradaRango): Promise<Response> {
  const ranking = await usecase.ejecutar(limite, rango);
  return ok(
    ranking.map((item) => ({
      perfil_id: item.perfilId,
      nombre_negocio: item.nombreNegocio,
      whatsapp: item.whatsapp,
      instagram: item.instagram,
      total: item.total,
    })),
  );
}

export async function obtenerSerieClics(usecase: ObtenerSerieClicsUseCase, rango: EntradaRango): Promise<Response> {
  return ok(await usecase.ejecutar(rango));
}

export async function obtenerClicsPorRubro(usecase: ObtenerClicsPorRubroUseCase, rango: EntradaRango): Promise<Response> {
  return ok(await usecase.ejecutar(rango));
}

export async function obtenerMapaCalorClics(
  usecase: ObtenerMapaCalorClicsUseCase,
  limite: number,
  rango: EntradaRango,
  orden: OrdenMapaCalor,
): Promise<Response> {
  const mapa = await usecase.ejecutar(limite, rango, orden);
  return ok({
    granularidad: mapa.granularidad,
    columnas: mapa.columnas,
    filas: mapa.filas.map((fila) => ({
      perfil_id: fila.perfilId,
      nombre_negocio: fila.nombreNegocio,
      whatsapp: fila.whatsapp,
      instagram: fila.instagram,
      total: fila.total,
      total_anterior: fila.totalAnterior,
      celdas: fila.celdas,
    })),
  });
}
