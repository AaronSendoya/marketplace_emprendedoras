import { urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearGetProductoMarketplace } from "@/api/composicion/productos";
import { obtenerProductoMarketplace } from "@/api/controllers/productos.controller";
import { leerParametrosRuta } from "@/api/http/validacion";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaIdProducto } from "@/api/openapi/rutas/productos";

export const GET = withErrorHandling(async (_request, contexto: RouteContext<"/api/v1/marketplace/productos/[id]">) => {
  const { id } = leerParametrosRuta(await contexto.params, EsquemaIdProducto);
  return obtenerProductoMarketplace(crearGetProductoMarketplace(), id, urlImagenPorDefecto());
});
