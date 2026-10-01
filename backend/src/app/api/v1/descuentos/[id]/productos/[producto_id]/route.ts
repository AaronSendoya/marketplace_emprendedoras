import { crearQuitarDescuento } from "@/api/composicion/descuentos";
import { actorDe } from "@/api/composicion/perfiles";
import { quitarDescuento } from "@/api/controllers/descuentos.controller";
import { leerParametrosRuta } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaQuitarProductoParams } from "@/api/openapi/rutas/descuentos";

export const DELETE = withErrorHandling(
  requireAuth(async (_request, contexto: RouteContext<"/api/v1/descuentos/[id]/productos/[producto_id]">, usuario) => {
    const { id, producto_id } = leerParametrosRuta(await contexto.params, EsquemaQuitarProductoParams);
    return quitarDescuento(crearQuitarDescuento(), actorDe(usuario), id, producto_id);
  }),
);
