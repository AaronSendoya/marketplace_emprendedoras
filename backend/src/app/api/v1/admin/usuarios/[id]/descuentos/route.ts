import { crearListMisDescuentos } from "@/api/composicion/descuentos";
import { listarMisDescuentos } from "@/api/controllers/descuentos.controller";
import { leerConsulta, leerParametrosRuta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaIdUsuario } from "@/api/openapi/rutas/admin-usuarios";
import { EsquemaMisDescuentosQuery } from "@/api/openapi/rutas/descuentos";

// Mismo caso de uso que GET /mis/descuentos, pero por el usuario_id que indique el Admin (módulo
// "Emprendimientos" del panel).
export const GET = withErrorHandling(
  requireAdmin(async (request, contexto: RouteContext<"/api/v1/admin/usuarios/[id]/descuentos">) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdUsuario);
    const { pagina, limite, estado } = leerConsulta(request, EsquemaMisDescuentosQuery);
    return listarMisDescuentos(crearListMisDescuentos(), id, { pagina, limite }, estado);
  }),
);
