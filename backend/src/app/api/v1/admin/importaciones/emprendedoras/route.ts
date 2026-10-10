import { actorDe } from "@/api/composicion/perfiles";
import { crearImportarEmprendedoras } from "@/api/composicion/importaciones";
import { filasDeCuerpo, importarEmprendedoras } from "@/api/controllers/importaciones.controller";
import { leerTokenDeGoogle } from "@/api/http/tokenGoogle";
import { leerCuerpo } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaFilasBody } from "@/api/openapi/rutas/importaciones";

// Regla 22: crea las cuentas y los perfiles de hasta 10 filas (5 si llevan imágenes de Drive). Devuelve las contraseñas temporales una
// sola vez. El token de Google (regla 17) solo se lee de su cabecera y se pasa al caso de uso: no se guarda ni se registra.
export const POST = withErrorHandling(
  requireAdmin(async (request, _contexto, admin) => {
    const token = leerTokenDeGoogle(request);
    const { filas } = await leerCuerpo(request, EsquemaFilasBody);
    return importarEmprendedoras(crearImportarEmprendedoras(), actorDe(admin), filasDeCuerpo(filas), token);
  }),
);
