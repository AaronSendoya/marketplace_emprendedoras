import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvError, parseEnv, swaggerHabilitado } from "@/shared/config/env";
import { fuentesDeProduccion, RAIZ } from "./soporte/fuentes";

// Regla 17: Swagger solo en desarrollo. Doble control (arranque + rutas) y ningún archivo publicado.
const base = {
  DATABASE_URL: "mysql://u:p@127.0.0.1:3306/catalogo",
  JWT_SECRET: "x".repeat(32),
  CORS_ALLOWED_ORIGINS: "http://localhost:3000",
};
const produccion = {
  ...base,
  APP_ENV: "production",
  R2_ACCOUNT_ID: "a",
  R2_ACCESS_KEY_ID: "b",
  R2_SECRET_ACCESS_KEY: "c",
  R2_BUCKET: "d",
  R2_PUBLIC_URL: "https://cdn.ejemplo.com",
  CLOUDFLARE_ZONE_ID: "zona",
  CLOUDFLARE_API_TOKEN: "token",
  EMAIL_DRIVER: "smtp",
  EMAIL_FROM: "no-responder@ejemplo.com",
  SMTP_HOST: "smtp.ejemplo.com",
  SMTP_PORT: "587",
  SMTP_USER: "u",
  SMTP_PASS: "p",
};

describe("primer control: el arranque (env.ts)", () => {
  it.each([
    ["producción", "production"],
    ["pruebas", "test"],
  ])("con APP_ENV de %s, SWAGGER_ENABLED=true impide arrancar y el mensaje lo dice", (_nombre, appEnv) => {
    const fuente = appEnv === "production" ? { ...produccion } : { ...base, APP_ENV: appEnv };

    expect(() => parseEnv({ ...fuente, SWAGGER_ENABLED: "true" })).toThrow(EnvError);
    expect(() => parseEnv({ ...fuente, SWAGGER_ENABLED: "true" })).toThrow(/SWAGGER_ENABLED.*APP_ENV=development/);
  });

  it("en desarrollo se puede habilitar; por defecto está cerrado", () => {
    expect(parseEnv({ ...base, APP_ENV: "development", SWAGGER_ENABLED: "true" }).SWAGGER_ENABLED).toBe(true);
    expect(parseEnv({ ...base, APP_ENV: "development" }).SWAGGER_ENABLED).toBe(false);
  });

  it("en producción arranca con Swagger en false o sin definir", () => {
    expect(parseEnv({ ...produccion, SWAGGER_ENABLED: "false" }).SWAGGER_ENABLED).toBe(false);
    expect(parseEnv(produccion).SWAGGER_ENABLED).toBe(false);
  });

  it("un valor ambiguo no se interpreta como verdadero", () => {
    for (const valor of ["1", "yes", "TRUE", "on"]) expect(() => parseEnv({ ...base, APP_ENV: "development", SWAGGER_ENABLED: valor })).toThrow(EnvError);
  });
});

describe("segundo control: las rutas (swaggerHabilitado)", () => {
  it.each([
    ["development", true, true],
    ["development", false, false],
    ["production", true, false],
    ["production", false, false],
    ["test", true, false],
  ] as const)("APP_ENV=%s con SWAGGER_ENABLED=%s -> habilitado: %s", (appEnv, swagger, esperado) => {
    expect(swaggerHabilitado({ APP_ENV: appEnv, SWAGGER_ENABLED: swagger })).toBe(esperado);
  });

  it("las dos rutas de documentación deciden con swaggerHabilitado y no leen la variable a pelo", () => {
    for (const ruta of ["src/app/docs/route.ts", "src/app/api/v1/openapi.json/route.ts"]) {
      const fuente = fuentesDeProduccion().find((f) => f.ruta === ruta)!;
      expect(fuente.texto, ruta).toContain("swaggerHabilitado(");
      expect(fuente.texto, ruta).not.toMatch(/getEnv\(\)\.SWAGGER_ENABLED/);
    }
  });

  it("solo esas dos rutas y el controlador de Swagger sirven la documentación", () => {
    const sirven = fuentesDeProduccion().filter((f) => /generarDocumento|swagger-ui/.test(f.texto) && !/^src\/api\/openapi\//.test(f.ruta));

    expect(sirven.map((f) => f.ruta).sort()).toEqual(["src/api/controllers/swagger.controller.ts"]);
  });

  it("no hay carpeta public/ ni copia estática de la especificación que se sirva sola", () => {
    const publica = join(RAIZ, "public");

    expect(existsSync(publica) ? readdirSync(publica) : []).not.toContain("openapi.json");
    expect(existsSync(join(publica, "docs"))).toBe(false);
  });
});

describe("las rutas de Swagger responden 404 fuera de desarrollo (con el entorno real)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function pedir(entorno: Record<string, string>, ruta: "docs" | "openapi") {
    vi.resetModules();
    vi.unstubAllEnvs();
    for (const [clave, valor] of Object.entries(entorno)) vi.stubEnv(clave, valor);
    const modulo =
      ruta === "docs" ? await import("@/app/docs/route") : await import("@/app/api/v1/openapi.json/route");
    return modulo.GET(new Request("http://localhost/x"), undefined as never);
  }

  const entornoProduccion = { ...produccion, SWAGGER_ENABLED: "false" };
  const entornoDesarrollo = { ...base, APP_ENV: "development" };

  it.each(["docs", "openapi"] as const)("producción: /%s responde 404 con el cuerpo estándar", async (ruta) => {
    const respuesta = await pedir(entornoProduccion, ruta);

    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).error.codigo).toBe("NO_ENCONTRADO");
  });

  it.each(["docs", "openapi"] as const)("desarrollo con SWAGGER_ENABLED=false: /%s responde 404", async (ruta) => {
    expect((await pedir({ ...entornoDesarrollo, SWAGGER_ENABLED: "false" }, ruta)).status).toBe(404);
  });

  it.each(["docs", "openapi"] as const)("desarrollo con SWAGGER_ENABLED=true: /%s responde 200", async (ruta) => {
    expect((await pedir({ ...entornoDesarrollo, SWAGGER_ENABLED: "true" }, ruta)).status).toBe(200);
  });

  it("la respuesta 404 de producción no revela que Swagger existe (igual que una ruta inexistente)", async () => {
    const respuesta = await pedir(entornoProduccion, "docs");
    const cuerpo = await respuesta.json();

    expect(JSON.stringify(cuerpo)).not.toMatch(/swagger|openapi|deshabilitad/i);
  });
});
