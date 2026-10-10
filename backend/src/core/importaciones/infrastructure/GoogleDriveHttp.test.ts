import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorArchivoDrive } from "../domain/IArchivosDrive";
import { GoogleDriveHttp, URL_BASE_DE_DRIVE } from "./GoogleDriveHttp";

const TOKEN = "ya29.token-de-prueba-0000000000000000";
const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz_-0123";

interface Llamada {
  url: string;
  cabeceras: Record<string, string>;
}
const llamadas: Llamada[] = [];

// Respuestas en orden; cada una es una Response o una función que la arma (o lanza).
function simular(...respuestas: (Response | (() => Response | Promise<Response>))[]) {
  llamadas.length = 0;
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      llamadas.push({ url: String(url), cabeceras: Object.fromEntries(new Headers(init?.headers).entries()) });
      const siguiente = respuestas[Math.min(i++, respuestas.length - 1)];
      return typeof siguiente === "function" ? siguiente() : siguiente.clone();
    }),
  );
}
const json = (cuerpo: unknown, estado = 200, cabeceras: Record<string, string> = {}) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { "content-type": "application/json", ...cabeceras } });
const sinEsperas = async () => undefined;
const drive = () => new GoogleDriveHttp(URL_BASE_DE_DRIVE, sinEsperas);

afterEach(() => vi.unstubAllGlobals());

describe("GoogleDriveHttp.cuenta", () => {
  it("devuelve el correo de la cuenta y manda el token solo en la cabecera Authorization", async () => {
    simular(json({ user: { emailAddress: "empresa@gmail.com" } }));

    expect(await drive().cuenta(TOKEN)).toBe("empresa@gmail.com");
    expect(llamadas[0].cabeceras.authorization).toBe(`Bearer ${TOKEN}`);
    expect(llamadas[0].url).not.toContain(TOKEN);
    expect(llamadas[0].url.startsWith("https://www.googleapis.com/drive/v3/about")).toBe(true);
  });

  it("un token que Google rechaza (401) es «conexión vencida»", async () => {
    simular(json({ error: { code: 401 } }, 401));

    await expect(drive().cuenta(TOKEN)).rejects.toMatchObject({ motivo: "conexion_vencida" });
  });

  it("si no informa el correo o responde otra cosa, devuelve null sin fallar", async () => {
    simular(json({}));
    expect(await drive().cuenta(TOKEN)).toBeNull();
    simular(json({}, 500));
    expect(await drive().cuenta(TOKEN)).toBeNull();
  });
});

describe("GoogleDriveHttp.consultar", () => {
  it("devuelve nombre, tipo, peso y si se puede descargar", async () => {
    simular(json({ name: "foto.jpg", mimeType: "image/jpeg", size: "2048", capabilities: { canDownload: true } }));

    expect(await drive().consultar(ID, TOKEN)).toEqual({
      estado: "ok",
      archivo: { nombre: "foto.jpg", tipoMime: "image/jpeg", bytes: 2048, puedeDescargar: true },
    });
  });

  it("pide solo los campos que necesita y marca el id con encodeURIComponent", async () => {
    simular(json({ name: "a", mimeType: "image/png" }));

    await drive().consultar(ID, TOKEN);

    const url = new URL(llamadas[0].url);
    expect(url.pathname).toBe(`/drive/v3/files/${ID}`);
    expect(url.searchParams.get("fields")).toBe("name,mimeType,size,trashed,capabilities(canDownload)");
    expect(url.searchParams.get("alt")).toBeNull();
  });

  it("un archivo de Google Docs no trae peso: bytes null", async () => {
    simular(json({ name: "doc", mimeType: "application/vnd.google-apps.document" }));

    const r = await drive().consultar(ID, TOKEN);

    expect(r).toMatchObject({ estado: "ok", archivo: { bytes: null } });
  });

  it("404 (no existe o no es de esa cuenta) y 403 (lo ve pero no puede) son «sin acceso»", async () => {
    simular(json({ error: { code: 404 } }, 404));
    expect(await drive().consultar(ID, TOKEN)).toEqual({ estado: "sin_acceso" });
    simular(json({ error: { code: 403, errors: [{ reason: "forbidden" }] } }, 403));
    expect(await drive().consultar(ID, TOKEN)).toEqual({ estado: "sin_acceso" });
  });

  it("un archivo en la papelera es «sin acceso»", async () => {
    simular(json({ name: "a", mimeType: "image/png", trashed: true }));

    expect(await drive().consultar(ID, TOKEN)).toEqual({ estado: "sin_acceso" });
  });

  it("canDownload en false llega como puedeDescargar false", async () => {
    simular(json({ name: "a", mimeType: "image/png", size: "10", capabilities: { canDownload: false } }));

    expect(await drive().consultar(ID, TOKEN)).toMatchObject({ archivo: { puedeDescargar: false } });
  });

  it("401 es conexión vencida", async () => {
    simular(json({}, 401));

    await expect(drive().consultar(ID, TOKEN)).rejects.toMatchObject({ motivo: "conexion_vencida" });
  });

  it("nunca pide a Google un id que no tenga la forma de un id de Drive (sin salir a la red)", async () => {
    simular(json({}));

    for (const malo of ["../etc/passwd", "a b", "1Abc?fields=x&", "", "x".repeat(300), "http://169.254.169.254/"]) {
      expect(await drive().consultar(malo, TOKEN)).toEqual({ estado: "sin_acceso" });
    }
    expect(llamadas).toHaveLength(0);
  });

  it("reintenta ante el límite de velocidad (403 rateLimitExceeded) y ante un 503, y al final responde", async () => {
    simular(
      json({ error: { errors: [{ reason: "rateLimitExceeded" }] } }, 403),
      json({}, 503),
      json({ name: "foto.jpg", mimeType: "image/jpeg", size: "10" }),
    );

    expect(await drive().consultar(ID, TOKEN)).toMatchObject({ estado: "ok" });
    expect(llamadas).toHaveLength(3);
  });

  it("si sigue fallando tras los reintentos, es «error» (no se acusa al archivo) y no es infinito", async () => {
    simular(json({}, 503));

    expect(await drive().consultar(ID, TOKEN)).toEqual({ estado: "error" });
    expect(llamadas).toHaveLength(3);
  });

  it("una caída de red (fetch lanza) es «error» tras reintentar, sin filtrar el mensaje", async () => {
    simular(() => {
      throw new TypeError("fetch failed: getaddrinfo ENOTFOUND www.googleapis.com");
    });

    await expect(drive().consultar(ID, TOKEN)).rejects.toMatchObject({ motivo: "error" });
    expect(llamadas).toHaveLength(3);
  });

  it("respeta Retry-After (con tope) al esperar entre reintentos", async () => {
    const esperas: number[] = [];
    simular(json({}, 429, { "retry-after": "2" }), json({ name: "a", mimeType: "image/png" }));

    await new GoogleDriveHttp(URL_BASE_DE_DRIVE, async (ms) => void esperas.push(ms)).consultar(ID, TOKEN);

    expect(esperas).toEqual([2000]);
  });

  it("no sigue redirecciones (un 302 no manda el token a otro sitio)", async () => {
    let opciones: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        opciones = init;
        return json({ name: "a", mimeType: "image/png" });
      }),
    );

    await drive().consultar(ID, TOKEN);

    expect(opciones?.redirect).toBe("error");
  });
});

describe("GoogleDriveHttp.descargar", () => {
  const MAXIMO = 1024;

  it("devuelve el contenido y pide alt=media", async () => {
    simular(new Response(Buffer.from("contenido de la imagen")));

    const contenido = await drive().descargar(ID, TOKEN, MAXIMO);

    expect(contenido.toString()).toBe("contenido de la imagen");
    expect(new URL(llamadas[0].url).searchParams.get("alt")).toBe("media");
    expect(llamadas[0].cabeceras.authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("corta por la cabecera Content-Length si ya dice que pasa del tope, sin leer el cuerpo", async () => {
    simular(new Response(Buffer.alloc(10), { headers: { "content-length": String(MAXIMO + 1) } }));

    await expect(drive().descargar(ID, TOKEN, MAXIMO)).rejects.toMatchObject({ motivo: "muy_grande" });
  });

  it("corta leyendo aunque la cabecera falte o mienta: lo que cuenta es lo que llega", async () => {
    const trozos = new ReadableStream<Uint8Array>({
      start(control) {
        for (let i = 0; i < 5; i++) control.enqueue(new Uint8Array(400));
        control.close();
      },
    });
    simular(new Response(trozos, { headers: { "content-length": "10" } }));

    await expect(drive().descargar(ID, TOKEN, MAXIMO)).rejects.toMatchObject({ motivo: "muy_grande" });
  });

  it("justo en el tope pasa", async () => {
    simular(new Response(Buffer.alloc(MAXIMO)));

    expect((await drive().descargar(ID, TOKEN, MAXIMO)).length).toBe(MAXIMO);
  });

  it.each([
    [404, "sin_acceso"],
    [403, "sin_acceso"],
    [401, "conexion_vencida"],
    [500, "error"],
  ])("una respuesta %i es «%s»", async (estado, motivo) => {
    simular(json({}, estado));

    await expect(drive().descargar(ID, TOKEN, MAXIMO)).rejects.toMatchObject({ motivo });
  });

  it("un id que no tiene forma de id de Drive no sale a la red", async () => {
    simular(new Response("x"));

    await expect(drive().descargar("../../secreto", TOKEN, MAXIMO)).rejects.toBeInstanceOf(ErrorArchivoDrive);
    expect(llamadas).toHaveLength(0);
  });

  it("un corte a mitad de la descarga es «error», no un archivo a medias", async () => {
    const roto = new ReadableStream<Uint8Array>({
      start(control) {
        control.enqueue(new Uint8Array(10));
        control.error(new Error("socket hang up"));
      },
    });
    simular(new Response(roto));

    await expect(drive().descargar(ID, TOKEN, MAXIMO)).rejects.toMatchObject({ motivo: "error" });
  });
});
