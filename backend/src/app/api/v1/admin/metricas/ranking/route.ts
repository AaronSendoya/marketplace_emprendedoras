import { crearObtenerRankingClics } from "@/api/composicion/metricas";
import { obtenerRankingClics } from "@/api/controllers/metricas.controller";
import { leerConsulta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaRankingQuery } from "@/api/openapi/rutas/metricas";

export const GET = withErrorHandling(
  requireAdmin(async (request) => {
    const { limite, ...rango } = leerConsulta(request, EsquemaRankingQuery);
    return obtenerRankingClics(crearObtenerRankingClics(), limite, rango);
  }),
);
