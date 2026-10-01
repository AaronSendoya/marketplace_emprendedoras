import { solicitarCodigoEmail } from "@/api/controllers/auth.controller";
import { crearRequestOtp } from "@/api/composicion/auth";
import { leerCuerpo } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaSolicitarCodigoEmailBody } from "@/api/openapi/rutas/auth";

export const POST = withErrorHandling(
  requireAuth(async (request) => {
    const { email_nuevo } = await leerCuerpo(request, EsquemaSolicitarCodigoEmailBody);
    return solicitarCodigoEmail(crearRequestOtp(), email_nuevo);
  }),
);
