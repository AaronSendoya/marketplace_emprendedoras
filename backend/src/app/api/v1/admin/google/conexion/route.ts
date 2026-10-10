import { crearConectarGoogle } from "@/api/composicion/importaciones";
import { conectarGoogle } from "@/api/controllers/google.controller";
import { leerCuerpo } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaConexionGoogleBody } from "@/api/openapi/rutas/google";

// Regla 17: cambia el código que devolvió Google por un token de lectura de una hora. No guarda nada.
export const POST = withErrorHandling(
  requireAdmin(async (request, _contexto, admin) => {
    const { codigo, code_verifier } = await leerCuerpo(request, EsquemaConexionGoogleBody);
    return conectarGoogle(crearConectarGoogle(), admin.id, codigo, code_verifier);
  }),
);
