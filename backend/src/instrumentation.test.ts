import { afterEach, describe, expect, it, vi } from "vitest";

// Un servidor de producción mal configurado debe detenerse (y no responder 500 a todo).
const VALIDO = {
  APP_ENV: "development",
  DATABASE_URL: "mysql://u:p@127.0.0.1:3306/catalogo",
  JWT_SECRET: "x".repeat(32),
  CORS_ALLOWED_ORIGINS: "http://localhost:3000",
};

async function registrar(entorno: Record<string, string>, nodeEnv: string) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("NODE_ENV", nodeEnv);
  for (const clave of ["APP_ENV", "DATABASE_URL", "JWT_SECRET", "CORS_ALLOWED_ORIGINS", "SWAGGER_ENABLED"]) vi.stubEnv(clave, "");
  for (const [clave, valor] of Object.entries(entorno)) vi.stubEnv(clave, valor);
  const escrito: string[] = [];
  vi.spyOn(process.stderr, "write").mockImplementation((texto) => (escrito.push(String(texto)), true));
  const salir = vi.spyOn(process, "exit").mockImplementation((() => {
    throw new Error("process.exit");
  }) as never);
  const { register } = await import("./instrumentation");
  return { register, salir, escrito };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("register (arranque del servidor)", () => {
  it("con la configuración válida no hace nada", async () => {
    const { register, salir } = await registrar(VALIDO, "production");

    await expect(register()).resolves.toBeUndefined();
    expect(salir).not.toHaveBeenCalled();
  });

  it("en producción con la configuración inválida escribe el motivo (sin valores) y detiene el proceso", async () => {
    const { register, salir, escrito } = await registrar({ ...VALIDO, APP_ENV: "production", SWAGGER_ENABLED: "true" }, "production");

    await expect(register()).rejects.toThrow("process.exit");

    expect(salir).toHaveBeenCalledWith(1);
    expect(escrito.join("")).toMatch(/SWAGGER_ENABLED: solo puede ser true con APP_ENV=development/);
    expect(escrito.join("")).not.toContain(VALIDO.JWT_SECRET);
    expect(escrito.join("")).not.toContain("mysql://");
  });

  it("en desarrollo relanza el error (se ve en pantalla) sin detener el proceso", async () => {
    const { register, salir } = await registrar({ ...VALIDO, JWT_SECRET: "corto" }, "development");

    await expect(register()).rejects.toThrow(/JWT_SECRET/);
    expect(salir).not.toHaveBeenCalled();
  });

  it("fuera del runtime de Node (edge) no valida nada", async () => {
    const { register } = await registrar({ APP_ENV: "production" }, "production");
    vi.stubEnv("NEXT_RUNTIME", "edge");

    await expect(register()).resolves.toBeUndefined();
  });
});
