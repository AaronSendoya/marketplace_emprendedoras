import type { ILogger } from "@/shared/domain/ILogger";
import type { ISesionRepository } from "../domain/ISesionRepository";

// Regla 5: cerrar sesión borra la sesión del token que hace la llamada. Desde ese momento ese token no vale en el servidor,
// aunque alguien lo hubiera copiado antes; las demás sesiones de la cuenta (otros dispositivos) siguen abiertas.
export class LogoutUseCase {
  constructor(
    private readonly sesiones: ISesionRepository,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(usuarioId: string, sesionId: string): Promise<void> {
    await this.sesiones.cerrar(sesionId, usuarioId);
    // Solo el id de la cuenta: nunca el token ni el id de la sesión (regla 17).
    this.logger.info("logout", { usuarioId });
  }
}
