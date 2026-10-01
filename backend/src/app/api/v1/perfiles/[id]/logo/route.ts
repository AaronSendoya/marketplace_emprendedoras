import { actorDe, crearReemplazarImagenPerfil, urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { reemplazarImagenPerfil } from "@/api/controllers/perfiles.controller";
import { resolverImagen } from "@/api/http/imagenes";
import { leerFormulario, LIMITE_CUERPO_UNA_IMAGEN, separarFormulario } from "@/api/http/multipart";
import { leerParametrosRuta, validarDatos } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaIdPerfil, EsquemaImagenForm } from "@/api/openapi/rutas/perfiles";

export const PUT = withErrorHandling(
  requireAuth(async (request, contexto: RouteContext<"/api/v1/perfiles/[id]/logo">, usuario) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdPerfil);
    const { texto, archivos } = await separarFormulario(await leerFormulario(request, LIMITE_CUERPO_UNA_IMAGEN), ["archivo"]);
    const { usar_predeterminada } = validarDatos(EsquemaImagenForm, texto, "formulario");

    return reemplazarImagenPerfil(
      crearReemplazarImagenPerfil(),
      actorDe(usuario),
      id,
      "logo",
      resolverImagen(archivos.archivo, usar_predeterminada, "archivo", "usar_predeterminada"),
      urlImagenPorDefecto(),
    );
  }),
);
