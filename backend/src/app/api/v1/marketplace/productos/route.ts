import { urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearGetMarketplace } from "@/api/composicion/productos";
import { listarMarketplace } from "@/api/controllers/productos.controller";
import { leerConsulta } from "@/api/http/validacion";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaMarketplaceQuery } from "@/api/openapi/rutas/productos";

export const GET = withErrorHandling(async (request) => {
  const { pagina, limite, perfil_id, ciudad_id, rubro_id, q, con_descuento, descuento_id, orden, semilla } = leerConsulta(request, EsquemaMarketplaceQuery);
  return listarMarketplace(
    crearGetMarketplace(),
    { perfilId: perfil_id, ciudadId: ciudad_id, rubroId: rubro_id, q, conDescuento: con_descuento === "true", descuentoId: descuento_id, orden, semilla },
    { pagina, limite },
    urlImagenPorDefecto(),
  );
});
