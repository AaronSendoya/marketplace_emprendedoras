import { actorDe } from "@/api/composicion/perfiles";
import { crearImportarEmprendedoras } from "@/api/composicion/importaciones";
import { filasDeCuerpo, importarEmprendedoras } from "@/api/controllers/importaciones.controller";
import { leerCuerpo } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaFilasBody } from "@/api/openapi/rutas/importaciones";

// Regla 22: crea las cuentas y los perfiles de hasta 10 filas. Devuelve las contraseñas temporales una sola vez.
export const POST = withErrorHandling(
  requireAdmin(async (request, _contexto, admin) => {
    const { filas } = await leerCuerpo(request, EsquemaFilasBody);
    return importarEmprendedoras(crearImportarEmprendedoras(), actorDe(admin), filasDeCuerpo(filas));
  }),
);
