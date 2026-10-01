import { describe, expect, it } from "vitest";
import { ErrorNoEncontrado } from "@/shared/domain/errors";
import { obtenerDocs, obtenerOpenApi } from "./swagger.controller";

describe("obtenerOpenApi", () => {
  it("devuelve el documento OpenAPI cuando Swagger está habilitado", async () => {
    const respuesta = obtenerOpenApi(true);

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).openapi).toBe("3.1.0");
  });

  it("con Swagger deshabilitado responde como si no existiera (404)", () => {
    expect(() => obtenerOpenApi(false)).toThrow(ErrorNoEncontrado);
  });
});

describe("obtenerDocs", () => {
  it("con Swagger deshabilitado responde como si no existiera (404)", () => {
    expect(() => obtenerDocs(false)).toThrow(ErrorNoEncontrado);
  });

  it("sirve Swagger UI con versión fija, SRI y persistAuthorization", async () => {
    const respuesta = obtenerDocs(true);
    const html = await respuesta.text();

    expect(respuesta.headers.get("Content-Type")).toContain("text/html");
    expect(html).toContain("swagger-ui-dist@5.33.0/swagger-ui-bundle.js");
    expect(html.match(/integrity="sha384-[\w+/=]+"/g)).toHaveLength(2);
    expect(html).toContain("persistAuthorization: true");
    expect(html).toContain('url: "/api/v1/openapi.json"');
  });

  it("no cachea la página y la protege con una CSP restrictiva", () => {
    const respuesta = obtenerDocs(true);
    const csp = respuesta.headers.get("Content-Security-Policy") ?? "";

    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("el script en línea lleva el mismo nonce que la CSP, distinto en cada petición", async () => {
    const primera = obtenerDocs(true);
    const segunda = obtenerDocs(true);
    const nonce = (respuesta: Response) => /'nonce-([0-9a-f]+)'/.exec(respuesta.headers.get("Content-Security-Policy") ?? "")?.[1];

    const nonce1 = nonce(primera);
    expect(nonce1).toBeTruthy();
    expect(await primera.text()).toContain(`<script nonce="${nonce1}">`);
    expect(nonce1).not.toBe(nonce(segunda));
  });
});
