import { crearCreateDescuento } from "@/api/composicion/descuentos";
import { actorDe } from "@/api/composicion/perfiles";
import { crearDescuento } from "@/api/controllers/descuentos.controller";
import { leerCuerpo } from "@/api/http/validacion";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaCrearDescuentoBody } from "@/api/openapi/rutas/descuentos";

export const POST = withErrorHandling(
  requireAuth(async (request, _contexto, usuario) => {
    const datos = await leerCuerpo(request, EsquemaCrearDescuentoBody);
    return crearDescuento(crearCreateDescuento(), actorDe(usuario), {
      perfilId: datos.perfil_id,
      porcentaje: datos.porcentaje,
      fechaInicio: datos.fecha_inicio,
      fechaFin: datos.fecha_fin,
    });
  }),
);
