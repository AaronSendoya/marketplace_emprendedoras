import { crearAsignarDescuento } from "@/api/composicion/descuentos";
import { actorDe } from "@/api/composicion/perfiles";
import { asignarDescuento } from "@/api/controllers/descuentos.controller";
import { leerCuerpo, leerParametrosRuta } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaAsignarProductosBody, EsquemaIdDescuento } from "@/api/openapi/rutas/descuentos";

export const POST = withErrorHandling(
  requireAuth(async (request, contexto: RouteContext<"/api/v1/descuentos/[id]/productos">, usuario) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdDescuento);
    const { producto_ids } = await leerCuerpo(request, EsquemaAsignarProductosBody);
    return asignarDescuento(crearAsignarDescuento(), actorDe(usuario), id, producto_ids);
  }),
);
