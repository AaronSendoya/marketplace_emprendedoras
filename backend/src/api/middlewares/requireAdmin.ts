import type { UsuarioAutenticado } from "@/core/auth/domain/Usuario";
import { ErrorProhibido } from "@/shared/domain/errors";
import { dependenciasAuthPorDefecto, requireAuth, type DependenciasAuth } from "./requireAuth";

type Manejador<C> = (request: Request, contexto: C, usuario: UsuarioAutenticado) => Response | Promise<Response>;

// Todo lo de requireAuth, y además exige el rol Admin (regla 5). El rol viene del usuario que ya
// cargó requireAuth de la base de datos, no del token.
export function requireAdmin<C = unknown>(
  manejador: Manejador<C>,
  dependencias: DependenciasAuth = dependenciasAuthPorDefecto(),
) {
  return requireAuth<C>((request, contexto, usuario) => {
    if (usuario.rol !== "Admin") throw new ErrorProhibido("Se requiere una cuenta Admin.");
    return manejador(request, contexto, usuario);
  }, dependencias);
}
