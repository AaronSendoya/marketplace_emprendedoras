import type { ICachePublica } from "@/shared/domain/ICachePublica";

export interface ConfigCloudflare {
  zoneId: string;
  // Token de API con el único permiso «Purgar caché» de esa zona (regla 17: mínimo privilegio).
  apiToken: string;
}

type Fetch = (entrada: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

// La API admite hasta 30 direcciones por petición de purga por URL.
const MAXIMO_POR_PETICION = 30;
const ESPERA_MAXIMA_MS = 10_000;

// Purga por URL en Cloudflare (regla 5: una imagen eliminada no debe seguir sirviéndose desde la caché de la CDN). El token
// nunca sale en un mensaje de error: solo el estado HTTP y el código que devuelve Cloudflare.
export class CloudflareCachePurge implements ICachePublica {
  constructor(
    private readonly config: ConfigCloudflare,
    private readonly peticion: Fetch = fetch,
  ) {}

  async purgar(urls: string[]): Promise<void> {
    const unicas = [...new Set(urls)];
    for (let i = 0; i < unicas.length; i += MAXIMO_POR_PETICION) {
      await this.purgarLote(unicas.slice(i, i + MAXIMO_POR_PETICION));
    }
  }

  private async purgarLote(files: string[]): Promise<void> {
    const respuesta = await this.peticion(`https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });

    let cuerpo: { success?: boolean; errors?: { code?: number }[] } | undefined;
    try {
      cuerpo = (await respuesta.json()) as typeof cuerpo;
    } catch {
      // Sin cuerpo JSON: queda el estado HTTP.
    }
    if (!respuesta.ok || cuerpo?.success === false) {
      const codigos = cuerpo?.errors?.map((e) => e.code).filter((c) => c !== undefined).join(", ");
      throw new Error(`Cloudflare no purgó la caché (HTTP ${respuesta.status}${codigos ? `, código ${codigos}` : ""}).`);
    }
  }
}
