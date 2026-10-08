import { getEnv, type Env } from "@/shared/config/env";
import type { ICachePublica } from "@/shared/domain/ICachePublica";
import { CloudflareCachePurge } from "./CloudflareCachePurge";
import { logger } from "./logger";

type EnvCache = Pick<Env, "CLOUDFLARE_ZONE_ID" | "CLOUDFLARE_API_TOKEN">;

// Sin las dos variables no hay CDN con caché delante de las imágenes (desarrollo, con la URL pública `r2.dev`, que no
// cachea): no hay nada que purgar. env.ts las exige en producción.
const sinCdn: ICachePublica = { purgar: async () => {} };

export function crearCachePublica(env: EnvCache = getEnv()): ICachePublica {
  if (env.CLOUDFLARE_ZONE_ID && env.CLOUDFLARE_API_TOKEN) {
    return new CloudflareCachePurge({ zoneId: env.CLOUDFLARE_ZONE_ID, apiToken: env.CLOUDFLARE_API_TOKEN });
  }
  logger.warn("cdn_sin_purga", { detalle: "CLOUDFLARE_* no está configurado: no se purga la caché de la CDN al borrar imágenes." });
  return sinCdn;
}
