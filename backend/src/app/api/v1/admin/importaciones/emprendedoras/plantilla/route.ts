import { crearGeneradorPlantilla } from "@/api/composicion/importaciones";
import { descargarPlantilla } from "@/api/controllers/importaciones.controller";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";

// Regla 22: el .xlsx de ejemplo que se descarga desde la pantalla de importación.
export const GET = withErrorHandling(requireAdmin(() => descargarPlantilla(crearGeneradorPlantilla())));
