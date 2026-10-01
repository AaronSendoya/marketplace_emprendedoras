import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "./env";

const base = {
  APP_ENV: "development",
  DATABASE_URL: "mysql://u:p@127.0.0.1:3306/catalogo_dev",
  JWT_SECRET: "x".repeat(32),
  CORS_ALLOWED_ORIGINS: "http://localhost:3001",
};

const r2Completo = {
  R2_ACCOUNT_ID: "cuenta",
  R2_ACCESS_KEY_ID: "clave",
  R2_SECRET_ACCESS_KEY: "secreto",
  R2_BUCKET: "bucket",
  R2_PUBLIC_URL: "https://cdn.ejemplo.com",
};

const smtpCompleto = {
  EMAIL_DRIVER: "smtp",
  EMAIL_FROM: "no-responder@ejemplo.com",
  SMTP_HOST: "smtp.ejemplo.com",
  SMTP_PORT: "587",
  SMTP_USER: "usuario",
  SMTP_PASS: "clave",
};

const mensajeDeError = (fuente: Record<string, string | undefined>) => {
  try {
    parseEnv(fuente);
  } catch (error) {
    expect(error).toBeInstanceOf(EnvError);
    return (error as Error).message;
  }
  throw new Error("parseEnv no lanzó error");
};

describe("parseEnv", () => {
  it("acepta la configuración mínima y aplica valores seguros por defecto", () => {
    const env = parseEnv(base);

    expect(env.SWAGGER_ENABLED).toBe(false);
    expect(env.DATABASE_POOL_MAX).toBe(5);
    expect(env.EMAIL_DRIVER).toBe("console");
    expect(env.CORS_ALLOWED_ORIGINS).toEqual(["http://localhost:3001"]);
  });

  describe("base de datos MySQL", () => {
    it.each([
      ["PostgreSQL", "postgresql://u:p@host/db"],
      ["sin nombre de base", "mysql://u:p@host:3306"],
      ["sin protocolo", "u:p@host:3306/db"],
    ])("rechaza una cadena %s sin filtrar su valor", (_caso, url) => {
      const mensaje = mensajeDeError({ ...base, DATABASE_URL: url });

      expect(mensaje).toContain("DATABASE_URL: debe ser una cadena de conexión mysql://");
      expect(mensaje).not.toContain("u:p@");
    });

    it("acepta la base de pruebas y un tamaño de pool propio", () => {
      const env = parseEnv({ ...base, DATABASE_URL_TEST: "mysql://u:p@127.0.0.1:3306/catalogo_test", DATABASE_POOL_MAX: "10" });

      expect(env.DATABASE_URL_TEST).toBe("mysql://u:p@127.0.0.1:3306/catalogo_test");
      expect(env.DATABASE_POOL_MAX).toBe(10);
    });

    it.each(["0", "51", "muchas"])("rechaza DATABASE_POOL_MAX=%s", (valor) => {
      expect(mensajeDeError({ ...base, DATABASE_POOL_MAX: valor })).toContain("DATABASE_POOL_MAX");
    });
  });

  it("falla con un mensaje claro si falta JWT_SECRET", () => {
    expect(mensajeDeError({ ...base, JWT_SECRET: undefined })).toContain("JWT_SECRET: es obligatoria");
  });

  it("rechaza un JWT_SECRET corto sin filtrar su valor en el mensaje", () => {
    const mensaje = mensajeDeError({ ...base, JWT_SECRET: "secreto-corto-xyz" });

    expect(mensaje).toContain("JWT_SECRET: debe tener al menos 32 caracteres");
    expect(mensaje).not.toContain("secreto-corto-xyz");
  });

  it("no da un valor por defecto a APP_ENV", () => {
    expect(mensajeDeError({ ...base, APP_ENV: undefined })).toContain("APP_ENV");
    expect(mensajeDeError({ ...base, APP_ENV: "staging" })).toContain("APP_ENV");
  });

  it("trata las variables vacías como ausentes", () => {
    const env = parseEnv({ ...base, R2_ACCOUNT_ID: "", DATABASE_URL_TEST: "  " });

    expect(env.R2_ACCOUNT_ID).toBeUndefined();
    expect(env.DATABASE_URL_TEST).toBeUndefined();
  });

  describe("CORS_ALLOWED_ORIGINS (regla 1)", () => {
    it("acepta varios orígenes separados por comas, con espacios", () => {
      const env = parseEnv({
        ...base,
        CORS_ALLOWED_ORIGINS: "https://catalogo.vercel.app , http://localhost:3001",
      });

      expect(env.CORS_ALLOWED_ORIGINS).toEqual(["https://catalogo.vercel.app", "http://localhost:3001"]);
    });

    it.each([
      ["comodín", "*"],
      ["barra final", "https://catalogo.vercel.app/"],
      ["con ruta", "https://catalogo.vercel.app/inicio"],
      ["sin protocolo", "catalogo.vercel.app"],
      ["protocolo no http", "ftp://catalogo.vercel.app"],
      ["lista vacía", ","],
    ])("rechaza %s", (_caso, valor) => {
      expect(mensajeDeError({ ...base, CORS_ALLOWED_ORIGINS: valor })).toContain("CORS_ALLOWED_ORIGINS");
    });

    it("indica cuál de los orígenes es el inválido", () => {
      const mensaje = mensajeDeError({
        ...base,
        CORS_ALLOWED_ORIGINS: "https://ok.com,https://mal.com/",
      });

      expect(mensaje).toContain("CORS_ALLOWED_ORIGINS.[1]");
    });
  });

  describe("SWAGGER_ENABLED", () => {
    it("acepta true y false", () => {
      expect(parseEnv({ ...base, SWAGGER_ENABLED: "true" }).SWAGGER_ENABLED).toBe(true);
      expect(parseEnv({ ...base, SWAGGER_ENABLED: "false" }).SWAGGER_ENABLED).toBe(false);
    });

    it("rechaza otros valores en vez de interpretarlos", () => {
      expect(mensajeDeError({ ...base, SWAGGER_ENABLED: "yes" })).toContain("SWAGGER_ENABLED");
    });
  });

  describe("R2", () => {
    it("puede faltar entero fuera de producción", () => {
      expect(() => parseEnv(base)).not.toThrow();
    });

    it("configurado a medias es un error y nombra lo que falta", () => {
      const mensaje = mensajeDeError({ ...base, R2_BUCKET: "bucket" });

      expect(mensaje).toContain("R2_ACCOUNT_ID");
      expect(mensaje).toContain("R2_PUBLIC_URL");
      expect(mensaje).not.toContain("R2_BUCKET:");
    });

    it("es obligatorio en producción", () => {
      expect(mensajeDeError({ ...base, APP_ENV: "production" })).toContain("R2_BUCKET");
      expect(() => parseEnv({ ...base, APP_ENV: "production", ...r2Completo, ...smtpCompleto })).not.toThrow();
    });

    it("R2_PUBLIC_URL no admite barra final", () => {
      const mensaje = mensajeDeError({ ...base, ...r2Completo, R2_PUBLIC_URL: "https://cdn.ejemplo.com/" });

      expect(mensaje).toContain("R2_PUBLIC_URL: no debe terminar en barra");
    });
  });

  describe("correo", () => {
    it("EMAIL_DRIVER=smtp exige toda la configuración SMTP", () => {
      const mensaje = mensajeDeError({ ...base, EMAIL_DRIVER: "smtp" });

      for (const clave of ["EMAIL_FROM", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"]) {
        expect(mensaje).toContain(clave);
      }
    });

    it("convierte SMTP_PORT a número", () => {
      expect(parseEnv({ ...base, ...smtpCompleto }).SMTP_PORT).toBe(587);
    });

    it("en producción no admite EMAIL_DRIVER=console (escribiría los códigos OTP en los logs)", () => {
      const produccion = { ...base, APP_ENV: "production", ...r2Completo };

      expect(mensajeDeError(produccion)).toContain("EMAIL_DRIVER: en producción debe ser smtp");
      expect(mensajeDeError({ ...produccion, EMAIL_DRIVER: "console" })).toContain("EMAIL_DRIVER");
      expect(() => parseEnv({ ...produccion, ...smtpCompleto })).not.toThrow();
    });

    it("fuera de producción acepta la consola", () => {
      expect(() => parseEnv({ ...base, APP_ENV: "test" })).not.toThrow();
    });
  });
});
