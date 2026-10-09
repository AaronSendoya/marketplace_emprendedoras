import { urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearGetPromocion } from "@/api/composicion/promociones";
import { obtenerPromocion } from "@/api/controllers/promociones.controller";
import { leerParametrosRuta } from "@/api/http/validacion";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaIdPromocion } from "@/api/openapi/rutas/promociones";

export const GET = withErrorHandling(async (_request, contexto: RouteContext<"/api/v1/marketplace/promociones/[id]">) => {
  const { id } = leerParametrosRuta(await contexto.params, EsquemaIdPromocion);
  return obtenerPromocion(crearGetPromocion(), id, urlImagenPorDefecto());
});
