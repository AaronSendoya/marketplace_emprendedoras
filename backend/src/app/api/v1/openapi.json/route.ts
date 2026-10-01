import { obtenerOpenApi } from "@/api/controllers/swagger.controller";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { getEnv, swaggerHabilitado } from "@/shared/config/env";

export const GET = withErrorHandling(() => obtenerOpenApi(swaggerHabilitado(getEnv())));
