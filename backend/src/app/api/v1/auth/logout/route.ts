import { crearLogout } from "@/api/composicion/auth";
import { logout } from "@/api/controllers/auth.controller";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";

// Regla 5: cierra la sesión del token que hace la llamada; ese token deja de valer al instante.
export const POST = withErrorHandling(requireAuth((_request, _contexto, usuario, sesion) => logout(crearLogout(), usuario.id, sesion.id)));
