import { restablecerPassword } from "@/api/controllers/auth.controller";
import { crearResetPassword } from "@/api/composicion/auth";
import { leerCuerpo } from "@/api/http/validacion";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaRestablecerPasswordBody } from "@/api/openapi/rutas/auth";

export const POST = withErrorHandling(async (request) => {
  const { email, codigo, password_nueva } = await leerCuerpo(request, EsquemaRestablecerPasswordBody);
  return restablecerPassword(crearResetPassword(), { email, codigo, passwordNueva: password_nueva });
});
