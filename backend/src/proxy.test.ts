import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { manejarCors } from "./proxy";

const FRONTEND = "http://localhost:3000";
const BACKEND = "http://localhost:3001"; // el propio origen del backend 
const AJENO = "https://sitio-ajeno.com";

const peticion = (ruta: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) =>
  new NextRequest(`${BACKEND}${ruta}`, init);

describe("manejarCors", () => {
  it("sin cabecera Origin, pasa sin cabeceras CORS (llamada servidor a servidor)", () => {
    const respuesta = manejarCors(peticion("/api/v1/health"), [FRONTEND]);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("con el Origin del propio backend, pasa con las cabeceras CORS (Swagger llama al mismo origen)", () => {
    const respuesta = manejarCors(peticion("/api/v1/health", { headers: { origin: BACKEND } }), [FRONTEND]);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBe(BACKEND);
  });

  it("con el Origin del frontend configurado, pasa con las cabeceras CORS", () => {
    const respuesta = manejarCors(peticion("/api/v1/health", { headers: { origin: FRONTEND } }), [FRONTEND]);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBe(FRONTEND);
    expect(respuesta.headers.get("Vary")).toBe("Origin");
  });

  it("admite varios orígenes configurados a la vez", () => {
    const otro = "https://catalogo-preview.example.com";
    const respuesta = manejarCors(peticion("/api/v1/health", { headers: { origin: otro } }), [FRONTEND, otro]);

    expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBe(otro);
  });

  it("con un Origin ajeno, rechaza con 403 aunque no sea un preflight", () => {
    const respuesta = manejarCors(peticion("/api/v1/health", { headers: { origin: AJENO } }), [FRONTEND]);

    expect(respuesta.status).toBe(403);
    expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("un preflight (OPTIONS) de un Origin ajeno se rechaza con 403", () => {
    const respuesta = manejarCors(
      peticion("/api/v1/health", { method: "OPTIONS", headers: { origin: AJENO } }),
      [FRONTEND],
    );

    expect(respuesta.status).toBe(403);
  });

  it("un preflight (OPTIONS) de un Origin permitido responde 204 con las cabeceras CORS y sin cuerpo", async () => {
    const respuesta = manejarCors(
      peticion("/api/v1/productos", { method: "OPTIONS", headers: { origin: FRONTEND } }),
      [FRONTEND],
    );

    expect(respuesta.status).toBe(204);
    expect(await respuesta.text()).toBe("");
    expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBe(FRONTEND);
    expect(respuesta.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST, PATCH, PUT, DELETE, OPTIONS");
    expect(respuesta.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type, Authorization");
    expect(respuesta.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it("agrega las cabeceras de seguridad en toda respuesta que deja pasar", () => {
    for (const respuesta of [
      manejarCors(peticion("/api/v1/health"), [FRONTEND]),
      manejarCors(peticion("/api/v1/health", { headers: { origin: FRONTEND } }), [FRONTEND]),
    ]) {
      expect(respuesta.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(respuesta.headers.get("X-Frame-Options")).toBe("DENY");
      expect(respuesta.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(respuesta.headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    }
  });

  it.each(["/api/v1/auth/login", "/api/v1/auth/password/restablecer", "/api/v1/admin/usuarios", "/api/v1/admin/usuarios/abc/estado"])(
    "agrega Cache-Control: no-store en las rutas de autenticación y de Admin (%s)",
    (ruta) => {
      const respuesta = manejarCors(peticion(ruta), [FRONTEND]);

      expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    },
  );

  it.each(["/api/v1/health", "/api/v1/administrador", "/api/v1/authx"])("no agrega Cache-Control en %s", (ruta) => {
    const respuesta = manejarCors(peticion(ruta), [FRONTEND]);

    expect(respuesta.headers.get("Cache-Control")).toBeNull();
  });

  it("el 403 lleva las cabeceras de seguridad, pero ninguna CORS", () => {
    const respuesta = manejarCors(peticion("/api/v1/auth/login", { headers: { origin: AJENO } }), [FRONTEND]);

    expect(respuesta.status).toBe(403);
    expect(respuesta.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
