import { actorDe, crearGetPerfil, crearUpdatePerfil, urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { editarPerfil, obtenerPerfil } from "@/api/controllers/perfiles.controller";
import { leerCuerpo, leerParametrosRuta } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaEditarPerfilBody, EsquemaIdPerfil } from "@/api/openapi/rutas/perfiles";

export const GET = withErrorHandling(async (_request, contexto: RouteContext<"/api/v1/perfiles/[id]">) => {
  const { id } = leerParametrosRuta(await contexto.params, EsquemaIdPerfil);
  return obtenerPerfil(crearGetPerfil(), id, urlImagenPorDefecto());
});

export const PATCH = withErrorHandling(
  requireAuth(async (request, contexto: RouteContext<"/api/v1/perfiles/[id]">, usuario) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdPerfil);
    const datos = await leerCuerpo(request, EsquemaEditarPerfilBody);
    return editarPerfil(
      crearUpdatePerfil(),
      actorDe(usuario),
      id,
      {
        nombreNegocio: datos.nombre_negocio,
        descripcion: datos.descripcion,
        whatsapp: datos.whatsapp,
        instagram: datos.instagram,
        otraRedSocial: datos.otra_red_social,
        ciudadId: datos.ciudad_id,
        rubroId: datos.rubro_id,
      },
      urlImagenPorDefecto(),
    );
  }),
);
