import { crearEstadoDeGoogle } from "@/api/composicion/importaciones";
import { estadoDeGoogle } from "@/api/controllers/google.controller";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";

// Regla 22: dice si el servidor tiene configurada la conexión con Google (si no, el importador no ofrece conectar).
export const GET = withErrorHandling(requireAdmin(() => estadoDeGoogle(crearEstadoDeGoogle())));
