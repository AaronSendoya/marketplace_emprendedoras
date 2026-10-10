import { ErrorValidacion } from "@/shared/domain/errors";
import type { IGoogleOAuth, TokenDeGoogle } from "../domain/IGoogleOAuth";

// Regla 17 (2026-10-09): el único sitio que habla con el inicio de sesión de Google. Pide solo lectura de Drive y nunca acceso sin
// conexión, así que no existe un `refresh_token` que guardar. La dirección a la que Google devuelve a la persona sale de la
// configuración, nunca de la petición: no hay forma de que una petición la cambie.

export const PERMISO_DE_LECTURA_DE_DRIVE = "https://www.googleapis.com/auth/drive.readonly";
export const URL_DE_AUTORIZACION_DE_GOOGLE = "https://accounts.google.com/o/oauth2/v2/auth";
export const URL_DEL_TOKEN_DE_GOOGLE = "https://oauth2.googleapis.com/token";

export interface ConfiguracionDeGoogle {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  urlDeAutorizacion: string;
  urlDelToken: string;
}

const TIEMPO_MS = 15_000;
const MENSAJE_FALLO = "No pudimos conectar con Google. Vuelve a pulsar «Conectar cuenta de Google» e inténtalo de nuevo.";
const MENSAJE_SIN_PERMISO = "Google no concedió el permiso de lectura de Drive. Vuelve a conectar y acepta el permiso.";

export class GoogleOAuthHttp implements IGoogleOAuth {
  // `null` = sin configurar: el importador funciona como antes.
  constructor(private readonly configuracion: ConfiguracionDeGoogle | null) {}

  disponible(): boolean {
    return this.configuracion !== null;
  }

  private requerir(): ConfiguracionDeGoogle {
    if (!this.configuracion) throw new Error("La conexión con Google no está configurada.");
    return this.configuracion;
  }

  urlDeAutorizacion(state: string, desafioPkce: string): string {
    const { clientId, redirectUri, urlDeAutorizacion } = this.requerir();
    const url = new URL(urlDeAutorizacion);
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: PERMISO_DE_LECTURA_DE_DRIVE,
      state,
      code_challenge: desafioPkce,
      code_challenge_method: "S256",
      // Sin acceso sin conexión: no se pide ni se guarda un token de renovación.
      access_type: "online",
      // Que la persona elija la cuenta cada vez: es la que decide a qué carpetas se llega.
      prompt: "select_account",
    }).toString();
    return url.toString();
  }

  async intercambiar(codigo: string, verificadorPkce: string): Promise<TokenDeGoogle> {
    const { clientId, clientSecret, redirectUri, urlDelToken } = this.requerir();
    let respuesta: Response;
    try {
      respuesta = await fetch(urlDelToken, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: codigo,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          code_verifier: verificadorPkce,
        }),
        signal: AbortSignal.timeout(TIEMPO_MS),
        redirect: "error",
      });
    } catch {
      throw new ErrorValidacion(MENSAJE_FALLO);
    }
    // Lo que diga Google (un código vencido, un cliente mal configurado) no se copia a la respuesta: puede llevar datos de la cuenta.
    if (!respuesta.ok) throw new ErrorValidacion(MENSAJE_FALLO);

    let cuerpo: { access_token?: unknown; expires_in?: unknown; scope?: unknown };
    try {
      cuerpo = (await respuesta.json()) as typeof cuerpo;
    } catch {
      throw new ErrorValidacion(MENSAJE_FALLO);
    }
    if (typeof cuerpo.access_token !== "string" || cuerpo.access_token.length === 0) throw new ErrorValidacion(MENSAJE_FALLO);
    const permisos = typeof cuerpo.scope === "string" ? cuerpo.scope.split(" ") : [];
    if (!permisos.includes(PERMISO_DE_LECTURA_DE_DRIVE)) throw new ErrorValidacion(MENSAJE_SIN_PERMISO);
    const expira = typeof cuerpo.expires_in === "number" && cuerpo.expires_in > 0 ? Math.floor(cuerpo.expires_in) : 3600;
    // Nunca más de una hora: es lo que se promete (regla 17), aunque Google diera más.
    return { accessToken: cuerpo.access_token, expiraEnSegundos: Math.min(expira, 3600) };
  }
}
