import { urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearGetMarketplace } from "@/api/composicion/productos";
import { listarMarketplace } from "@/api/controllers/productos.controller";
import { leerConsulta } from "@/api/http/validacion";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaMarketplaceQuery } from "@/api/openapi/rutas/productos";

export const GET = withErrorHandling(async (request) => {
  const { pagina, limite, perfil_id, ciudad_id, rubro_id, q } = leerConsulta(request, EsquemaMarketplaceQuery);
  return listarMarketplace(
    crearGetMarketplace(),
    { perfilId: perfil_id, ciudadId: ciudad_id, rubroId: rubro_id, q },
    { pagina, limite },
    urlImagenPorDefecto(),
  );
});
