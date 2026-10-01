import { z } from "zod";
import { actorDe, urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearReemplazarImagenProducto } from "@/api/composicion/productos";
import { reemplazarImagenProducto } from "@/api/controllers/productos.controller";
import { exigirImagen } from "@/api/http/imagenes";
import { leerFormulario, LIMITE_CUERPO_UNA_IMAGEN, separarFormulario } from "@/api/http/multipart";
import { leerParametrosRuta, validarDatos } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaIdProducto } from "@/api/openapi/rutas/productos";

// El formulario solo lleva el archivo: cualquier campo de texto sobra.
const EsquemaSinCampos = z.object({}).strict();

export const PUT = withErrorHandling(
  requireAuth(async (request, contexto: RouteContext<"/api/v1/productos/[id]/imagen">, usuario) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdProducto);
    const { texto, archivos } = await separarFormulario(await leerFormulario(request, LIMITE_CUERPO_UNA_IMAGEN), ["archivo"]);
    validarDatos(EsquemaSinCampos, texto, "formulario");

    return reemplazarImagenProducto(
      crearReemplazarImagenProducto(),
      actorDe(usuario),
      id,
      exigirImagen(archivos.archivo, "archivo"),
      urlImagenPorDefecto(),
    );
  }),
);
