import { actorDe, urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { crearDeactivateProducto, crearUpdateProducto } from "@/api/composicion/productos";
import { desactivarProducto, editarProducto } from "@/api/controllers/productos.controller";
import { leerCuerpo, leerParametrosRuta } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaEditarProductoBody, EsquemaIdProducto } from "@/api/openapi/rutas/productos";

export const PATCH = withErrorHandling(
  requireAuth(async (request, contexto: RouteContext<"/api/v1/productos/[id]">, usuario) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdProducto);
    const datos = await leerCuerpo(request, EsquemaEditarProductoBody);
    return editarProducto(
      crearUpdateProducto(),
      actorDe(usuario),
      id,
      {
        nombre: datos.nombre,
        descripcion: datos.descripcion === "" ? null : datos.descripcion,
        precio: datos.precio,
        mostrarPrecio: datos.mostrar_precio,
        activo: datos.activo,
      },
      urlImagenPorDefecto(),
    );
  }),
);

export const DELETE = withErrorHandling(
  requireAuth(async (_request, contexto: RouteContext<"/api/v1/productos/[id]">, usuario) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdProducto);
    return desactivarProducto(crearDeactivateProducto(), actorDe(usuario), id);
  }),
);
