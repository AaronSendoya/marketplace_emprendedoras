import { urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearGetPromociones } from "@/api/composicion/promociones";
import { listarPromociones } from "@/api/controllers/promociones.controller";
import { leerConsulta } from "@/api/http/validacion";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaPromocionesQuery } from "@/api/openapi/rutas/promociones";

export const GET = withErrorHandling(async (request) => {
  const { pagina, limite, perfil_id, ciudad_id, rubro_id, q, orden, semilla } = leerConsulta(request, EsquemaPromocionesQuery);
  return listarPromociones(
    crearGetPromociones(),
    { perfilId: perfil_id, ciudadId: ciudad_id, rubroId: rubro_id, q, orden, semilla },
    { pagina, limite },
    urlImagenPorDefecto(),
  );
});
