import { login } from "@/api/controllers/auth.controller";
import { leerCuerpo } from "@/api/http/validacion";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { EsquemaLoginBody } from "@/api/openapi/rutas/auth";
import { LoginUseCase } from "@/core/auth/application/LoginUseCase";
import { BcryptPasswordHasher } from "@/core/auth/infrastructure/BcryptPasswordHasher";
import { crearJwtTokenService } from "@/core/auth/infrastructure/JwtTokenService";
import { MySqlIntentosLoginRepository } from "@/core/auth/infrastructure/MySqlIntentosLoginRepository";
import { MySqlUsuarioRepository } from "@/core/auth/infrastructure/MySqlUsuarioRepository";
import { logger } from "@/shared/infrastructure/logger";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";
import { SystemClock } from "@/shared/infrastructure/SystemClock";

export const POST = withErrorHandling(async (request) => {
  const { email, password } = await leerCuerpo(request, EsquemaLoginBody);
  const db = getMySqlClient();
  const usecase = new LoginUseCase(
    new MySqlUsuarioRepository(db),
    new BcryptPasswordHasher(),
    crearJwtTokenService(),
    new MySqlIntentosLoginRepository(db),
    new SystemClock(),
    logger,
  );
  return login(usecase, email, password);
});
