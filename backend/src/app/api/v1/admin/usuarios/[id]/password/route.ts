import { restablecerPasswordAdmin } from "@/api/controllers/admin-usuarios.controller";
import { crearAdminRestablecerPassword } from "@/api/composicion/auth";
import { leerCuerpo, leerParametrosRuta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaIdUsuario, EsquemaRestablecerPasswordAdminBody } from "@/api/openapi/rutas/admin-usuarios";

export const PATCH = withErrorHandling(
  requireAdmin(async (request, contexto: RouteContext<"/api/v1/admin/usuarios/[id]/password">, admin) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdUsuario);
    const { password } = await leerCuerpo(request, EsquemaRestablecerPasswordAdminBody);
    return restablecerPasswordAdmin(crearAdminRestablecerPassword(), admin.id, id, password);
  }),
);
