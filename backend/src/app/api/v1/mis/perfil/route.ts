import { crearGetMiPerfil, urlImagenPorDefecto } from "@/api/composicion/perfiles";
import { obtenerMiPerfil } from "@/api/controllers/perfiles.controller";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";

export const GET = withErrorHandling(
  requireAuth((_request, _contexto, usuario) => obtenerMiPerfil(crearGetMiPerfil(), usuario.id, urlImagenPorDefecto())),
);
