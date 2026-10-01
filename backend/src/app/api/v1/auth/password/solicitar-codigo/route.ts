import { solicitarCodigoPassword } from "@/api/controllers/auth.controller";
import { crearRequestOtp } from "@/api/composicion/auth";
import { leerCuerpo } from "@/api/http/validacion";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaSolicitarCodigoPasswordBody } from "@/api/openapi/rutas/auth";

export const POST = withErrorHandling(async (request) => {
  const { email } = await leerCuerpo(request, EsquemaSolicitarCodigoPasswordBody);
  return solicitarCodigoPassword(crearRequestOtp(), email);
});
