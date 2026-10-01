import { obtenerHealth } from "@/api/controllers/health.controller";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";

export const GET = withErrorHandling(() => obtenerHealth(getMySqlClient()));
