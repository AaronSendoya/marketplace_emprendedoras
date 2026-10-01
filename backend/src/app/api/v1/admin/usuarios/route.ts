import { crearUsuario, listarUsuarios } from "@/api/controllers/admin-usuarios.controller";
import { crearCreateUsuario, crearListUsuarios } from "@/api/composicion/auth";
import { leerConsulta, leerCuerpo } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaCrearUsuarioBody, EsquemaListarUsuariosQuery } from "@/api/openapi/rutas/admin-usuarios";

export const GET = withErrorHandling(
  requireAdmin((request) => {
    const { pagina, limite, q, estado } = leerConsulta(request, EsquemaListarUsuariosQuery);
    return listarUsuarios(crearListUsuarios(), { q, activo: estado === undefined ? undefined : estado === "activo" }, { pagina, limite });
  }),
);

export const POST = withErrorHandling(
  requireAdmin(async (request, _contexto, admin) => {
    const { apellido_materno, apellido_paterno, ...resto } = await leerCuerpo(request, EsquemaCrearUsuarioBody);
    return crearUsuario(crearCreateUsuario(), admin.id, {
      ...resto,
      apellidoPaterno: apellido_paterno,
      apellidoMaterno: apellido_materno ?? null,
    });
  }),
);
