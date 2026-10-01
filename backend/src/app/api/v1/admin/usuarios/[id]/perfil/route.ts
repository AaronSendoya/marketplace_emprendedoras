import { crearGetMiPerfil, urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { obtenerMiPerfil } from "@/api/controllers/perfiles.controller";
import { leerParametrosRuta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaIdUsuario } from "@/api/openapi/rutas/admin-usuarios";

// Mismo caso de uso que GET /mis/perfil, pero por el usuario_id que indique el Admin (módulo
// "Emprendimientos" del panel): el caso de uso ya recibe un usuarioId genérico, no "el actor".
export const GET = withErrorHandling(
  requireAdmin(async (_request, contexto: RouteContext<"/api/v1/admin/usuarios/[id]/perfil">) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdUsuario);
    return obtenerMiPerfil(crearGetMiPerfil(), id, urlImagenPorDefecto());
  }),
);
