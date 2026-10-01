import { cambiarEstadoUsuario } from "@/api/controllers/admin-usuarios.controller";
import { crearCambiarEstadoUsuario } from "@/api/composicion/auth";
import { leerCuerpo, leerParametrosRuta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaEstadoBody, EsquemaIdUsuario } from "@/api/openapi/rutas/admin-usuarios";

export const PATCH = withErrorHandling(
  requireAdmin(async (request, contexto: RouteContext<"/api/v1/admin/usuarios/[id]/estado">, admin) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdUsuario);
    const { activo } = await leerCuerpo(request, EsquemaEstadoBody);
    return cambiarEstadoUsuario(crearCambiarEstadoUsuario(), admin.id, id, activo);
  }),
);
