import { obtenerDocs } from "@/api/controllers/swagger.controller";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { getEnv, swaggerHabilitado } from "@/shared/config/env";

export const GET = withErrorHandling(() => obtenerDocs(swaggerHabilitado(getEnv())));
