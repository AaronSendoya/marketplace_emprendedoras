import { crearObtenerResumenClics } from "@/api/composicion/metricas";
import { obtenerResumenClics } from "@/api/controllers/metricas.controller";
import { leerConsulta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaRangoQuery } from "@/api/openapi/rutas/metricas";

export const GET = withErrorHandling(
  requireAdmin(async (request) => {
    const rango = leerConsulta(request, EsquemaRangoQuery);
    return obtenerResumenClics(crearObtenerResumenClics(), rango);
  }),
);
