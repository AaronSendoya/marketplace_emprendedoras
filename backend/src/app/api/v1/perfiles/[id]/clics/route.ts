import { crearRegistrarClic } from "@/api/composicion/metricas";
import { registrarClic } from "@/api/controllers/metricas.controller";
import { leerCuerpo, leerParametrosRuta } from "@/api/http/validacion";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaIdPerfil } from "@/api/openapi/rutas/perfiles";
import { EsquemaRegistrarClicBody } from "@/api/openapi/rutas/metricas";

// Público, sin autenticar (regla 19): el catálogo lo dispara al hacer clic en WhatsApp/Instagram.
export const POST = withErrorHandling(async (request, contexto: RouteContext<"/api/v1/perfiles/[id]/clics">) => {
  const { id } = leerParametrosRuta(await contexto.params, EsquemaIdPerfil);
  const { tipo } = await leerCuerpo(request, EsquemaRegistrarClicBody);
  return registrarClic(crearRegistrarClic(), id, tipo);
});
