import { crearUrlDeAutorizacionDeGoogle } from "@/api/composicion/importaciones";
import { urlDeAutorizacion } from "@/api/controllers/google.controller";
import { leerConsulta } from "@/api/http/validacion";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaAutorizacionGoogleQuery } from "@/api/openapi/rutas/google";

// Regla 17: la dirección de Google para elegir la cuenta (solo lectura de Drive, sin acceso sin conexión).
export const GET = withErrorHandling(
  requireAdmin((request) => {
    const { state, code_challenge } = leerConsulta(request, EsquemaAutorizacionGoogleQuery);
    return urlDeAutorizacion(crearUrlDeAutorizacionDeGoogle(), state, code_challenge);
  }),
);
