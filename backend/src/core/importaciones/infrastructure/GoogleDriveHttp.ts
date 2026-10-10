import { ID_DE_DRIVE } from "../domain/EnlaceDrive";
import { ErrorArchivoDrive, type ArchivoDeDrive, type ConsultaDeArchivo, type IArchivosDrive } from "../domain/IArchivosDrive";

// Regla 22 (2026-10-09) y regla 17: el único sitio que habla con la API de Google Drive. Solo lectura. Solo llama a la dirección base
// que se le da (la de Google, o la de un Google simulado en desarrollo): del Excel solo recibe un id, que se valida otra vez aquí, y
// nunca arma una dirección con texto de fuera. El token nunca se registra ni forma parte de ninguna dirección.

export const URL_BASE_DE_DRIVE = "https://www.googleapis.com/drive/v3";

const TIEMPO_DE_CONSULTA_MS = 15_000;
// Una foto de teléfono de 20 MB por una conexión de hosting compartido: la descarga entera, con el cuerpo incluido.
const TIEMPO_DE_DESCARGA_MS = 60_000;
const INTENTOS = 3;
const ESPERA_MAXIMA_MS = 3_000;

type Esperar = (milisegundos: number) => Promise<void>;
const esperarDeVerdad: Esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// Google responde 403 (no 429) cuando se piden demasiadas cosas por segundo: se distingue de un 403 de falta de permiso por su motivo.
const MOTIVOS_DE_LIMITE_DE_VELOCIDAD = new Set(["rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded"]);

async function esLimiteDeVelocidad(respuesta: Response): Promise<boolean> {
  if (respuesta.status === 429) return true;
  if (respuesta.status !== 403) return false;
  try {
    const cuerpo = (await respuesta.clone().json()) as { error?: { errors?: { reason?: string }[]; status?: string } };
    return (cuerpo.error?.errors ?? []).some((e) => e.reason !== undefined && MOTIVOS_DE_LIMITE_DE_VELOCIDAD.has(e.reason));
  } catch {
    return false;
  }
}

export class GoogleDriveHttp implements IArchivosDrive {
  constructor(
    private readonly base: string = URL_BASE_DE_DRIVE,
    private readonly esperar: Esperar = esperarDeVerdad,
  ) {}

  // GET con reintentos ante el límite de velocidad y los errores pasajeros de Google. Devuelve la última respuesta, buena o mala.
  private async pedir(ruta: string, token: string, tiempoMs: number): Promise<Response> {
    let ultima: Response | null = null;
    for (let intento = 0; intento < INTENTOS; intento++) {
      try {
        ultima = await fetch(`${this.base}${ruta}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(tiempoMs), redirect: "error" });
      } catch {
        ultima = null;
        if (intento === INTENTOS - 1) throw new ErrorArchivoDrive("error");
        await this.esperar(Math.min(400 * 2 ** intento, ESPERA_MAXIMA_MS));
        continue;
      }
      const reintentable = ultima.status >= 500 || (await esLimiteDeVelocidad(ultima));
      if (!reintentable || intento === INTENTOS - 1) return ultima;
      const indicada = Number(ultima.headers.get("retry-after"));
      await this.esperar(Math.min(Number.isFinite(indicada) && indicada > 0 ? indicada * 1000 : 400 * 2 ** intento, ESPERA_MAXIMA_MS));
      // Sin `await`: cancelar un cuerpo que se duplicó con `clone()` no termina hasta que se cancelan las dos copias.
      void ultima.body?.cancel().catch(() => undefined);
    }
    // Inalcanzable: el último intento siempre devuelve o lanza.
    if (ultima) return ultima;
    throw new ErrorArchivoDrive("error");
  }

  async cuenta(token: string): Promise<string | null> {
    const respuesta = await this.pedir("/about?fields=user(emailAddress)", token, TIEMPO_DE_CONSULTA_MS);
    if (respuesta.status === 401) throw new ErrorArchivoDrive("conexion_vencida");
    if (!respuesta.ok) return null;
    try {
      const cuerpo = (await respuesta.json()) as { user?: { emailAddress?: unknown } };
      return typeof cuerpo.user?.emailAddress === "string" ? cuerpo.user.emailAddress : null;
    } catch {
      return null;
    }
  }

  async consultar(id: string, token: string): Promise<ConsultaDeArchivo> {
    if (!ID_DE_DRIVE.test(id)) return { estado: "sin_acceso" };
    const campos = "name,mimeType,size,trashed,capabilities(canDownload)";
    const respuesta = await this.pedir(`/files/${encodeURIComponent(id)}?fields=${encodeURIComponent(campos)}&supportsAllDrives=true`, token, TIEMPO_DE_CONSULTA_MS);
    if (respuesta.status === 401) throw new ErrorArchivoDrive("conexion_vencida");
    // Drive responde 404 tanto si no existe como si la cuenta no puede verlo, y 403 si lo ve pero no le dan permiso.
    if (respuesta.status === 404 || respuesta.status === 403) return { estado: "sin_acceso" };
    if (!respuesta.ok) return { estado: "error" };
    try {
      const cuerpo = (await respuesta.json()) as {
        name?: unknown;
        mimeType?: unknown;
        size?: unknown;
        trashed?: unknown;
        capabilities?: { canDownload?: unknown };
      };
      if (cuerpo.trashed === true) return { estado: "sin_acceso" };
      const bytes = typeof cuerpo.size === "string" && /^\d+$/.test(cuerpo.size) ? Number(cuerpo.size) : null;
      const archivo: ArchivoDeDrive = {
        nombre: typeof cuerpo.name === "string" ? cuerpo.name : "",
        tipoMime: typeof cuerpo.mimeType === "string" ? cuerpo.mimeType : "",
        bytes,
        puedeDescargar: cuerpo.capabilities?.canDownload !== false,
      };
      return { estado: "ok", archivo };
    } catch {
      return { estado: "error" };
    }
  }

  async descargar(id: string, token: string, maximoBytes: number): Promise<Buffer> {
    if (!ID_DE_DRIVE.test(id)) throw new ErrorArchivoDrive("sin_acceso");
    const respuesta = await this.pedir(`/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, token, TIEMPO_DE_DESCARGA_MS);
    if (respuesta.status === 401) throw new ErrorArchivoDrive("conexion_vencida");
    if (respuesta.status === 404 || respuesta.status === 403) throw new ErrorArchivoDrive("sin_acceso");
    if (!respuesta.ok || !respuesta.body) throw new ErrorArchivoDrive("error");

    const declarado = Number(respuesta.headers.get("content-length"));
    if (Number.isFinite(declarado) && declarado > maximoBytes) {
      void respuesta.body.cancel().catch(() => undefined);
      throw new ErrorArchivoDrive("muy_grande");
    }

    // El tope se aplica leyendo: una cabecera puede faltar o mentir, y lo que cuenta es lo que llega.
    const trozos: Uint8Array[] = [];
    let recibidos = 0;
    const lector = respuesta.body.getReader();
    try {
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        recibidos += value.length;
        if (recibidos > maximoBytes) {
          void lector.cancel().catch(() => undefined);
          throw new ErrorArchivoDrive("muy_grande");
        }
        trozos.push(value);
      }
    } catch (error) {
      if (error instanceof ErrorArchivoDrive) throw error;
      throw new ErrorArchivoDrive("error");
    }
    return Buffer.concat(trozos, recibidos);
  }
}
