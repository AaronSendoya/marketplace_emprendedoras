import { urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearListMisProductos } from "@/api/composicion/productos";
import { listarMisProductos } from "@/api/controllers/productos.controller";
import { leerConsulta, leerParametrosRuta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaIdUsuario } from "@/api/openapi/rutas/admin-usuarios";
import { EsquemaMisProductosQuery } from "@/api/openapi/rutas/productos";

// Mismo caso de uso que GET /mis/productos (activos o no, con el precio real), pero por el
// usuario_id que indique el Admin (módulo "Emprendimientos" del panel).
export const GET = withErrorHandling(
  requireAdmin(async (request, contexto: RouteContext<"/api/v1/admin/usuarios/[id]/productos">) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdUsuario);
    const { pagina, limite } = leerConsulta(request, EsquemaMisProductosQuery);
    return listarMisProductos(crearListMisProductos(), id, { pagina, limite }, urlImagenPorDefecto());
  }),
);
