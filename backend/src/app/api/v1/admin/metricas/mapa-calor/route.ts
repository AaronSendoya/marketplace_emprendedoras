import { crearObtenerMapaCalorClics } from "@/api/composicion/metricas";
import { obtenerMapaCalorClics } from "@/api/controllers/metricas.controller";
import { leerConsulta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaMapaCalorQuery } from "@/api/openapi/rutas/metricas";

// Los parámetros del ranking (`desde`, `hasta`, `limite` de 1 a 20) más `orden`: total, whatsapp o instagram.
export const GET = withErrorHandling(
  requireAdmin(async (request) => {
    const { limite, orden, ...rango } = leerConsulta(request, EsquemaMapaCalorQuery);
    return obtenerMapaCalorClics(crearObtenerMapaCalorClics(), limite, rango, orden);
  }),
);
