import { getEnv, type Env } from "@/shared/config/env";
import type { IImageStorage } from "@/shared/domain/IImageStorage";
import { CloudflareImageService } from "./CloudflareImageService";
import { ImageStorageEnMemoria } from "./ImageStorageEnMemoria";
import { logger } from "./logger";

type EnvImagenes = Pick<
  Env,
  "APP_ENV" | "R2_ACCOUNT_ID" | "R2_ACCESS_KEY_ID" | "R2_SECRET_ACCESS_KEY" | "R2_BUCKET" | "R2_PUBLIC_URL"
>;

// env.ts ya garantiza que R2 está completo o ausente (y obligatorio en producción). Sin R2, fuera de
// producción, las imágenes van a memoria para poder desarrollar antes de tener el bucket.
export function crearImageStorage(env: EnvImagenes = getEnv()): IImageStorage {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = env;
  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL) {
    return new CloudflareImageService({
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET,
      publicUrl: R2_PUBLIC_URL,
    });
  }
  if (env.APP_ENV === "production") {
    throw new Error("Cloudflare R2 no está configurado: completa las variables R2_* (ver .env.example).");
  }
  logger.warn("r2_no_configurado", { detalle: "Las imágenes se guardan en memoria y se pierden al reiniciar." });
  return new ImageStorageEnMemoria();
}

// En desarrollo Next recarga los módulos: se guarda en globalThis para no perder las imágenes en memoria.
const global = globalThis as typeof globalThis & { __imageStorage?: IImageStorage };

export function imageStoragePorDefecto(): IImageStorage {
  global.__imageStorage ??= crearImageStorage();
  return global.__imageStorage;
}
