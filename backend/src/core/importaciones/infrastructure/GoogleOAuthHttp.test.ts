import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import {
  GoogleOAuthHttp,
  PERMISO_DE_LECTURA_DE_DRIVE,
  URL_DE_AUTORIZACION_DE_GOOGLE,
  URL_DEL_TOKEN_DE_GOOGLE,
  type ConfiguracionDeGoogle,
} from "./GoogleOAuthHttp";

const CONFIG: ConfiguracionDeGoogle = {
  clientId: "123-abc.apps.googleusercontent.com",
  clientSecret: "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ste-xxxx",
  redirectUri: "http://localhost:3000/admin/google/callback",
  urlDeAutorizacion: URL_DE_AUTORIZACION_DE_GOOGLE,
  urlDelToken: URL_DEL_TOKEN_DE_GOOGLE,
};
const STATE = "estado-aleatorio-0123456789abcdef";
const DESAFIO = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

afterEach(() => vi.unstubAllGlobals());

describe("GoogleOAuthHttp.urlDeAutorizacion", () => {
  const url = () => new URL(new GoogleOAuthHttp(CONFIG).urlDeAutorizacion(STATE, DESAFIO));

  it("manda a Google solo con lectura de Drive, sin acceso sin conexión y eligiendo la cuenta", () => {
    const u = url();

    expect(`${u.origin}${u.pathname}`).toBe(URL_DE_AUTORIZACION_DE_GOOGLE);
    expect(u.searchParams.get("scope")).toBe(PERMISO_DE_LECTURA_DE_DRIVE);
    expect(u.searchParams.get("access_type")).toBe("online");
    expect(u.searchParams.get("prompt")).toBe("select_account");
    expect(u.searchParams.get("response_type")).toBe("code");
  });

  it("lleva el state y el desafío PKCE (S256) que dio el frontend", () => {
    const u = url();

    expect(u.searchParams.get("state")).toBe(STATE);
    expect(u.searchParams.get("code_challenge")).toBe(DESAFIO);
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("la dirección de retorno sale de la configuración y el secreto del cliente nunca va en la dirección", () => {
    const u = url();

    expect(u.searchParams.get("redirect_uri")).toBe(CONFIG.redirectUri);
    expect(u.searchParams.get("client_id")).toBe(CONFIG.clientId);
    expect(u.toString()).not.toContain(CONFIG.clientSecret);
  });

  it("no pide ningún otro permiso que la lectura de Drive", () => {
    expect(url().searchParams.get("scope")).not.toMatch(/(email|profile|openid|drive\.file|drive(?!\.readonly))/);
  });
});

describe("GoogleOAuthHttp.disponible", () => {
  it("sin configuración no está disponible y no arma direcciones", () => {
    const sin = new GoogleOAuthHttp(null);

    expect(sin.disponible()).toBe(false);
    expect(() => sin.urlDeAutorizacion(STATE, DESAFIO)).toThrow();
    expect(new GoogleOAuthHttp(CONFIG).disponible()).toBe(true);
  });
});

describe("GoogleOAuthHttp.intercambiar", () => {
  const respuesta = (cuerpo: unknown, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { "content-type": "application/json" } });
  let enviado: { url: string; cuerpo: URLSearchParams; init?: RequestInit } | undefined;
  const simular = (res: Response | (() => never)) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        enviado = { url: String(url), cuerpo: new URLSearchParams(String(init?.body)), init };
        if (typeof res === "function") return res();
        return res;
      }),
    );

  it("cambia el código por un token de acceso de una hora, comprobando que concedió el permiso de lectura", async () => {
    simular(respuesta({ access_token: "ya29.token", expires_in: 3599, scope: PERMISO_DE_LECTURA_DE_DRIVE, token_type: "Bearer" }));

    const token = await new GoogleOAuthHttp(CONFIG).intercambiar("4/0Codigo-de-google", "verificador-pkce-0123456789abcdefghijklmnopqrstu");

    expect(token).toEqual({ accessToken: "ya29.token", expiraEnSegundos: 3599 });
    expect(enviado?.url).toBe(URL_DEL_TOKEN_DE_GOOGLE);
    expect(Object.fromEntries(enviado!.cuerpo)).toMatchObject({
      grant_type: "authorization_code",
      code: "4/0Codigo-de-google",
      code_verifier: "verificador-pkce-0123456789abcdefghijklmnopqrstu",
      redirect_uri: CONFIG.redirectUri,
      client_id: CONFIG.clientId,
      client_secret: CONFIG.clientSecret,
    });
  });

  it("nunca promete más de una hora, aunque Google diera más", async () => {
    simular(respuesta({ access_token: "ya29.token", expires_in: 86400, scope: PERMISO_DE_LECTURA_DE_DRIVE }));

    expect((await new GoogleOAuthHttp(CONFIG).intercambiar("c", "v")).expiraEnSegundos).toBe(3600);
  });

  it("no sigue redirecciones", async () => {
    simular(respuesta({ access_token: "ya29.token", expires_in: 3600, scope: PERMISO_DE_LECTURA_DE_DRIVE }));

    await new GoogleOAuthHttp(CONFIG).intercambiar("c", "v");

    expect(enviado?.init?.redirect).toBe("error");
  });

  it("un código que Google rechaza da un error de validación con mensaje propio, sin copiar lo que dijo Google", async () => {
    simular(respuesta({ error: "invalid_grant", error_description: "Bad Request for alguien@gmail.com" }, 400));

    const error = await new GoogleOAuthHttp(CONFIG).intercambiar("c", "v").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).message).toContain("Conectar cuenta de Google");
    expect((error as ErrorValidacion).message).not.toContain("alguien@gmail.com");
    expect((error as ErrorValidacion).message).not.toContain("invalid_grant");
  });

  it("si Google no concedió el permiso de lectura de Drive, lo dice", async () => {
    simular(respuesta({ access_token: "ya29.token", expires_in: 3600, scope: "openid email" }));

    await expect(new GoogleOAuthHttp(CONFIG).intercambiar("c", "v")).rejects.toThrow(/permiso de lectura de Drive/);
  });

  it("una caída de red o una respuesta que no es JSON también es un error de validación genérico", async () => {
    simular(() => {
      throw new TypeError("fetch failed");
    });
    await expect(new GoogleOAuthHttp(CONFIG).intercambiar("c", "v")).rejects.toBeInstanceOf(ErrorValidacion);

    simular(new Response("<html>502</html>", { status: 200 }));
    await expect(new GoogleOAuthHttp(CONFIG).intercambiar("c", "v")).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("una respuesta sin token de acceso no se acepta", async () => {
    simular(respuesta({ expires_in: 3600, scope: PERMISO_DE_LECTURA_DE_DRIVE }));

    await expect(new GoogleOAuthHttp(CONFIG).intercambiar("c", "v")).rejects.toBeInstanceOf(ErrorValidacion);
  });
});
