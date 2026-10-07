import { crearValidarFilas } from "@/api/composicion/importaciones";
import { filasDeCuerpo, validarFilas } from "@/api/controllers/importaciones.controller";
import { leerCuerpo } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaFilasBody } from "@/api/openapi/rutas/importaciones";

// Regla 22: revisa filas que el Admin corrigió en la vista previa. No escribe nada.
export const POST = withErrorHandling(
  requireAdmin(async (request) => {
    const { filas } = await leerCuerpo(request, EsquemaFilasBody);
    return validarFilas(crearValidarFilas(), filasDeCuerpo(filas));
  }),
);
