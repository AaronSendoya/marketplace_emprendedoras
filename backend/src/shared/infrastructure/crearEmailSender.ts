import { getEnv, type Env } from "@/shared/config/env";
import type { IEmailSender } from "@/shared/domain/IEmailSender";
import { ConsoleEmailSender } from "./ConsoleEmailSender";

export function crearEmailSender(env: Pick<Env, "EMAIL_DRIVER"> = getEnv()): IEmailSender {
  if (env.EMAIL_DRIVER === "console") return new ConsoleEmailSender();
  // El envío real llega en el paso 8b, cuando se elija el proveedor.
  throw new Error("EMAIL_DRIVER=smtp aún no está implementado (paso 8b).");
}
