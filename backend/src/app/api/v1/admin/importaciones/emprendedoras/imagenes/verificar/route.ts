import { crearVerificarImagenesDrive } from "@/api/composicion/importaciones";
import { filasAVerificarDeCuerpo, verificarImagenes } from "@/api/controllers/importaciones.controller";
import { leerTokenDeGoogle } from "@/api/http/tokenGoogle";
import { leerCuerpo } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaVerificarImagenesBody } from "@/api/openapi/rutas/importaciones";

// Regla 22: comprueba en Drive la foto y el logo de cada fila con la cuenta de Google conectada. Solo lee metadatos; no escribe nada.
export const POST = withErrorHandling(
  requireAdmin(async (request) => {
    const token = leerTokenDeGoogle(request);
    const { filas } = await leerCuerpo(request, EsquemaVerificarImagenesBody);
    return verificarImagenes(crearVerificarImagenesDrive(), filasAVerificarDeCuerpo(filas), token);
  }),
);
