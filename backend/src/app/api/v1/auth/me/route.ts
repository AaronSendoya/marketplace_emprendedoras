import { obtenerMe } from "@/api/controllers/auth.controller";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";

export const GET = withErrorHandling(requireAuth((_request, _contexto, usuario) => obtenerMe(usuario)));
