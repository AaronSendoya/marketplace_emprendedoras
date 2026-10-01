import { urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearListMisProductos } from "@/api/composicion/productos";
import { listarMisProductos } from "@/api/controllers/productos.controller";
import { leerConsulta } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaMisProductosQuery } from "@/api/openapi/rutas/productos";

export const GET = withErrorHandling(
  requireAuth((request, _contexto, usuario) => {
    const { pagina, limite } = leerConsulta(request, EsquemaMisProductosQuery);
    return listarMisProductos(crearListMisProductos(), usuario.id, { pagina, limite }, urlImagenPorDefecto());
  }),
);
