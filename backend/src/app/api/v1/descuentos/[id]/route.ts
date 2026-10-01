import { crearUpdateDescuento } from "@/api/composicion/descuentos";
import { actorDe } from "@/api/composicion/perfiles";
import { editarDescuento } from "@/api/controllers/descuentos.controller";
import { leerCuerpo, leerParametrosRuta } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaEditarDescuentoBody, EsquemaIdDescuento } from "@/api/openapi/rutas/descuentos";

export const PATCH = withErrorHandling(
  requireAuth(async (request, contexto: RouteContext<"/api/v1/descuentos/[id]">, usuario) => {
    const { id } = leerParametrosRuta(await contexto.params, EsquemaIdDescuento);
    const datos = await leerCuerpo(request, EsquemaEditarDescuentoBody);
    return editarDescuento(crearUpdateDescuento(), actorDe(usuario), id, {
      porcentaje: datos.porcentaje,
      fechaInicio: datos.fecha_inicio,
      fechaFin: datos.fecha_fin,
    });
  }),
);
