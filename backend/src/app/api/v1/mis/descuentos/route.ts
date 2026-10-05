import { crearListMisDescuentos } from "@/api/composicion/descuentos";
import { listarMisDescuentos } from "@/api/controllers/descuentos.controller";
import { leerConsulta } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaMisDescuentosQuery } from "@/api/openapi/rutas/descuentos";

export const GET = withErrorHandling(
  requireAuth((request, _contexto, usuario) => {
    const { pagina, limite, estado } = leerConsulta(request, EsquemaMisDescuentosQuery);
    return listarMisDescuentos(crearListMisDescuentos(), usuario.id, { pagina, limite }, estado);
  }),
);
