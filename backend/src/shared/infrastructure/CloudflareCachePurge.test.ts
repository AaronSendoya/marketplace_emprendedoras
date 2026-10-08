import { describe, expect, it } from "vitest";
import { CloudflareCachePurge } from "./CloudflareCachePurge";
import { crearCachePublica } from "./crearCachePublica";

interface Llamada {
  url: string;
  init: RequestInit;
}

function peticionFalsa(respuestas: { ok: boolean; status: number; cuerpo?: unknown }[]) {
  const llamadas: Llamada[] = [];
  const peticion = async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    const r = respuestas[Math.min(llamadas.length - 1, respuestas.length - 1)];
    return { ok: r.ok, status: r.status, json: async () => r.cuerpo ?? { success: r.ok } };
  };
  return { llamadas, peticion };
}

const config = { zoneId: "zona-123", apiToken: "token-secreto-abc" };
const urls = (n: number) => Array.from({ length: n }, (_, i) => `https://cdn.ejemplo.com/perfiles/${i}.webp`);

describe("CloudflareCachePurge", () => {
  it("pide la purga por URL a la zona, con el token como Bearer y las direcciones en el cuerpo", async () => {
    const { llamadas, peticion } = peticionFalsa([{ ok: true, status: 200 }]);

    await new CloudflareCachePurge(config, peticion).purgar(urls(2));

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].url).toBe("https://api.cloudflare.com/client/v4/zones/zona-123/purge_cache");
    expect(llamadas[0].init.method).toBe("POST");
    expect((llamadas[0].init.headers as Record<string, string>).Authorization).toBe("Bearer token-secreto-abc");
    expect(JSON.parse(llamadas[0].init.body as string)).toEqual({ files: urls(2) });
  });

  it("parte en lotes de 30 direcciones (el máximo de Cloudflare)", async () => {
    const { llamadas, peticion } = peticionFalsa([{ ok: true, status: 200 }]);

    await new CloudflareCachePurge(config, peticion).purgar(urls(65));

    expect(llamadas.map((l) => (JSON.parse(l.init.body as string).files as string[]).length)).toEqual([30, 30, 5]);
  });

  it("no repite direcciones y sin direcciones no llama a Cloudflare", async () => {
    const { llamadas, peticion } = peticionFalsa([{ ok: true, status: 200 }]);
    const purga = new CloudflareCachePurge(config, peticion);

    await purga.purgar([]);
    await purga.purgar([urls(1)[0], urls(1)[0]]);

    expect(llamadas).toHaveLength(1);
    expect(JSON.parse(llamadas[0].init.body as string).files).toHaveLength(1);
  });

  it("si Cloudflare rechaza la purga lanza un error con el estado y el código, sin el token", async () => {
    const { peticion } = peticionFalsa([{ ok: false, status: 403, cuerpo: { success: false, errors: [{ code: 10000 }] } }]);

    const error = await new CloudflareCachePurge(config, peticion).purgar(urls(1)).catch((e: unknown) => e);

    expect((error as Error).message).toBe("Cloudflare no purgó la caché (HTTP 403, código 10000).");
    expect((error as Error).message).not.toContain("token-secreto-abc");
  });

  it("un 200 con success=false también es un fallo", async () => {
    const { peticion } = peticionFalsa([{ ok: true, status: 200, cuerpo: { success: false, errors: [{ code: 1200 }] } }]);

    await expect(new CloudflareCachePurge(config, peticion).purgar(urls(1))).rejects.toThrow("HTTP 200, código 1200");
  });

  it("un fallo de red se propaga (el caso de uso lo registra)", async () => {
    const peticion = async () => {
      throw new Error("sin conexión");
    };

    await expect(new CloudflareCachePurge(config, peticion).purgar(urls(1))).rejects.toThrow("sin conexión");
  });
});

describe("crearCachePublica", () => {
  it("con las dos variables devuelve la purga de Cloudflare", () => {
    expect(crearCachePublica({ CLOUDFLARE_ZONE_ID: "z", CLOUDFLARE_API_TOKEN: "t" })).toBeInstanceOf(CloudflareCachePurge);
  });

  it("sin ellas (desarrollo con r2.dev) devuelve una purga que no hace nada ni falla", async () => {
    const cache = crearCachePublica({ CLOUDFLARE_ZONE_ID: undefined, CLOUDFLARE_API_TOKEN: undefined });

    expect(cache).not.toBeInstanceOf(CloudflareCachePurge);
    await expect(cache.purgar(urls(3))).resolves.toBeUndefined();
  });
});
