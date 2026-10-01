import { cambiarEmail } from "@/api/controllers/auth.controller";
import { crearCambiarEmail } from "@/api/composicion/auth";
import { leerCuerpo } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaCambiarEmailBody } from "@/api/openapi/rutas/auth";

export const PUT = withErrorHandling(
  requireAuth(async (request, _contexto, usuario) => {
    const { email_nuevo, codigo } = await leerCuerpo(request, EsquemaCambiarEmailBody);
    return cambiarEmail(crearCambiarEmail(), usuario.id, email_nuevo, codigo);
  }),
);
