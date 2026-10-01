import { actualizarUsuario, obtenerUsuario } from "@/api/controllers/admin-usuarios.controller";
import { crearActualizarUsuario, crearGetUsuario } from "@/api/composicion/auth";
import { leerCuerpo, leerParametrosRuta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaEditarUsuarioBody, EsquemaIdUsuario } from "@/api/openapi/rutas/admin-usuarios";
import type { CambiosUsuario } from "@/core/auth/domain/Usuario";

export const GET = withErrorHandling(
  requireAdmin(async (_request, contexto: RouteContext<"/api/v1/admin/usuarios/[id]">) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdUsuario);
    return obtenerUsuario(crearGetUsuario(), id);
  }),
);

export const PATCH = withErrorHandling(
  requireAdmin(async (request, contexto: RouteContext<"/api/v1/admin/usuarios/[id]">, admin) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdUsuario);
    const cuerpo = await leerCuerpo(request, EsquemaEditarUsuarioBody);
    // Solo los campos presentes: el resto no se toca (leerCuerpo ya rechazó cualquier campo extra).
    const cambios: CambiosUsuario = {
      ...(cuerpo.email !== undefined && { email: cuerpo.email }),
      ...(cuerpo.nombres !== undefined && { nombres: cuerpo.nombres }),
      ...(cuerpo.apellido_paterno !== undefined && { apellidoPaterno: cuerpo.apellido_paterno }),
      ...(cuerpo.apellido_materno !== undefined && { apellidoMaterno: cuerpo.apellido_materno }),
    };
    return actualizarUsuario(crearActualizarUsuario(), admin.id, id, cambios);
  }),
);
