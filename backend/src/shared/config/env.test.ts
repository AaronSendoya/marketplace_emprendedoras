import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "./env";

const base = {
  APP_ENV: "development",
  DATABASE_URL: "mysql://u:p@127.0.0.1:3306/catalogo_dev",
  JWT_SECRET: "x".repeat(32),
  CORS_ALLOWED_ORIGINS: "http://localhost:3001",
};

// Un secreto como el que genera el comando de .env.example (randomBytes(32) en base64url): largo y con caracteres variados.
const JWT_PRODUCCION = "Zq8vK2mX9pL4wR7tY1nB6cD3fG5hJ0sA8eU2iO4yT6rE9wQ";

const r2Completo = {
  R2_ACCOUNT_ID: "cuenta",
  R2_ACCESS_KEY_ID: "clave",
  R2_SECRET_ACCESS_KEY: "secreto",
  R2_BUCKET: "bucket",
  R2_PUBLIC_URL: "https://cdn.ejemplo.com",
};

const cloudflareCompleto = {
  CLOUDFLARE_ZONE_ID: "zona",
  CLOUDFLARE_API_TOKEN: "token",
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
      expect(mensajeDeError({ ...base, JWT_SECRET: JWT_PRODUCCION, APP_ENV: "production" })).toContain("R2_BUCKET");
      expect(() => parseEnv({ ...base, JWT_SECRET: JWT_PRODUCCION, APP_ENV: "production", ...r2Completo, ...cloudflareCompleto, ...smtpCompleto })).not.toThrow();
    });

    it("R2_PUBLIC_URL no admite barra final", () => {
      const mensaje = mensajeDeError({ ...base, ...r2Completo, R2_PUBLIC_URL: "https://cdn.ejemplo.com/" });

      expect(mensaje).toContain("R2_PUBLIC_URL: no debe terminar en barra");
    });
  });

  describe("Cloudflare (purga de la caché al eliminar cuentas, regla 5)", () => {
    it("puede faltar entera fuera de producción (desarrollo con r2.dev, que no cachea)", () => {
      expect(() => parseEnv(base)).not.toThrow();
      expect(parseEnv(base).CLOUDFLARE_ZONE_ID).toBeUndefined();
    });

    it("configurada a medias es un error y nombra lo que falta", () => {
      const mensaje = mensajeDeError({ ...base, CLOUDFLARE_ZONE_ID: "zona" });

      expect(mensaje).toContain("CLOUDFLARE_API_TOKEN");
      expect(mensaje).not.toContain("CLOUDFLARE_ZONE_ID:");
    });

    it("es obligatoria en producción: sin ella una imagen borrada seguiría sirviéndose desde la CDN", () => {
      const produccion = { ...base, JWT_SECRET: JWT_PRODUCCION, APP_ENV: "production", ...r2Completo, ...smtpCompleto };

      const mensaje = mensajeDeError(produccion);

      expect(mensaje).toContain("CLOUDFLARE_ZONE_ID");
      expect(mensaje).toContain("CLOUDFLARE_API_TOKEN");
      expect(() => parseEnv({ ...produccion, ...cloudflareCompleto })).not.toThrow();
    });
  });

  describe("secretos y base de datos en producción (regla 17)", () => {
    const produccion = { ...base, JWT_SECRET: JWT_PRODUCCION, APP_ENV: "production", ...r2Completo, ...cloudflareCompleto, ...smtpCompleto };

    it("acepta un JWT_SECRET largo y variado", () => {
      expect(() => parseEnv(produccion)).not.toThrow();
    });

    it.each([
      ["repetido", "x".repeat(64)],
      ["corto aunque sea variado", "Zq8vK2mX9pL4wR7tY1nB6cD3fG5hJ0sA8eU2iO4yT6"],
      ["largo pero con pocos caracteres distintos", "abcdefghij".repeat(6)],
    ])("rechaza un JWT_SECRET %s y el mensaje no copia el valor", (_caso, secreto) => {
      const mensaje = mensajeDeError({ ...produccion, JWT_SECRET: secreto });

      expect(mensaje).toContain("JWT_SECRET: en producción debe tener al menos 43 caracteres y 16 distintos");
      expect(mensaje).not.toContain(secreto);
    });

    it("fuera de producción acepta el secreto mínimo de 32 caracteres", () => {
      expect(() => parseEnv({ ...base, JWT_SECRET: "x".repeat(32) })).not.toThrow();
      expect(() => parseEnv({ ...base, APP_ENV: "test", JWT_SECRET: "x".repeat(32) })).not.toThrow();
    });

    it("DATABASE_URL con ?ssl=no-verify se rechaza y el mensaje no copia la cadena", () => {
      const cadena = "mysql://catalogo:clave-secreta@db.ejemplo.com:4000/catalogo_prod?ssl=no-verify";
      const mensaje = mensajeDeError({ ...produccion, DATABASE_URL: cadena });

      expect(mensaje).toContain("DATABASE_URL: en producción no admite ?ssl=no-verify");
      expect(mensaje).not.toContain("clave-secreta");
      expect(mensaje).not.toContain("db.ejemplo.com");
    });

    it("DATABASE_URL con ?ssl=true, o sin ssl en el propio servidor, se acepta", () => {
      expect(() => parseEnv({ ...produccion, DATABASE_URL: "mysql://u:p@db.ejemplo.com:4000/catalogo_prod?ssl=true" })).not.toThrow();
      expect(() => parseEnv({ ...produccion, DATABASE_URL: "mysql://u:p@localhost:3306/catalogo_prod" })).not.toThrow();
    });

    it("fuera de producción ?ssl=no-verify sigue permitido (acceso remoto temporal para migrar)", () => {
      expect(() => parseEnv({ ...base, DATABASE_URL: "mysql://u:p@db.ejemplo.com:4000/catalogo_dev?ssl=no-verify" })).not.toThrow();
    });
  });

  describe("HTTPS en producción (regla 17)", () => {
    const produccion = { ...base, JWT_SECRET: JWT_PRODUCCION, APP_ENV: "production", ...r2Completo, ...cloudflareCompleto, ...smtpCompleto };

    it("un origen CORS http:// de otro host se rechaza en producción y el mensaje no copia el valor", () => {
      const mensaje = mensajeDeError({ ...produccion, CORS_ALLOWED_ORIGINS: "https://catalogo.ejemplo.com,http://catalogo.ejemplo.com" });

      expect(mensaje).toContain("CORS_ALLOWED_ORIGINS: en producción cada origen debe ser https://");
      expect(mensaje).not.toContain("http://catalogo.ejemplo.com");
    });

    it("acepta orígenes https:// y, para probar el build en el computador, localhost y 127.0.0.1 con http://", () => {
      expect(() => parseEnv({ ...produccion, CORS_ALLOWED_ORIGINS: "https://catalogo.ejemplo.com" })).not.toThrow();
      expect(() => parseEnv({ ...produccion, CORS_ALLOWED_ORIGINS: "https://catalogo.ejemplo.com,http://localhost:3000" })).not.toThrow();
      expect(() => parseEnv({ ...produccion, CORS_ALLOWED_ORIGINS: "http://127.0.0.1:3000" })).not.toThrow();
    });

    it("un host que solo empieza como localhost no cuenta como local", () => {
      expect(mensajeDeError({ ...produccion, CORS_ALLOWED_ORIGINS: "http://localhost.atacante.com" })).toContain("CORS_ALLOWED_ORIGINS");
      expect(mensajeDeError({ ...produccion, CORS_ALLOWED_ORIGINS: "http://127.0.0.1.atacante.com" })).toContain("CORS_ALLOWED_ORIGINS");
    });

    it("R2_PUBLIC_URL http:// se rechaza en producción", () => {
      const mensaje = mensajeDeError({ ...produccion, R2_PUBLIC_URL: "http://cdn.ejemplo.com" });

      expect(mensaje).toContain("R2_PUBLIC_URL: en producción debe ser https://");
      expect(mensaje).not.toContain("cdn.ejemplo.com");
    });

    it("fuera de producción acepta http:// en cualquier host", () => {
      expect(() => parseEnv({ ...base, CORS_ALLOWED_ORIGINS: "http://catalogo.ejemplo.com", ...r2Completo, R2_PUBLIC_URL: "http://cdn.ejemplo.com" })).not.toThrow();
      expect(() => parseEnv({ ...base, APP_ENV: "test", CORS_ALLOWED_ORIGINS: "http://catalogo.ejemplo.com" })).not.toThrow();
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
      const produccion = { ...base, JWT_SECRET: JWT_PRODUCCION, APP_ENV: "production", ...r2Completo, ...cloudflareCompleto };

      expect(mensajeDeError(produccion)).toContain("EMAIL_DRIVER: en producción debe ser smtp");
      expect(mensajeDeError({ ...produccion, EMAIL_DRIVER: "console" })).toContain("EMAIL_DRIVER");
      expect(() => parseEnv({ ...produccion, ...smtpCompleto })).not.toThrow();
    });

    it("fuera de producción acepta la consola", () => {
      expect(() => parseEnv({ ...base, APP_ENV: "test" })).not.toThrow();
    });
  });

  describe("conexión con Google para importar imágenes de Drive (regla 17)", () => {
    const google = {
      GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "GOCSPX-secreto-de-prueba",
      GOOGLE_REDIRECT_URI: "http://localhost:3000/admin/google/callback",
    };
    const produccion = { ...base, JWT_SECRET: JWT_PRODUCCION, APP_ENV: "production", ...r2Completo, ...cloudflareCompleto, ...smtpCompleto };

    it("es opcional: sin las tres variables el servidor arranca y la importación funciona sin Drive", () => {
      const env = parseEnv(base);

      expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
      expect(env.GOOGLE_REDIRECT_URI).toBeUndefined();
      expect(() => parseEnv(produccion)).not.toThrow();
    });

    it("las variables vacías de .env.example cuentan como ausentes", () => {
      expect(() => parseEnv({ ...base, GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GOOGLE_REDIRECT_URI: "" })).not.toThrow();
    });

    it("completas, se aceptan", () => {
      expect(parseEnv({ ...base, ...google }).GOOGLE_REDIRECT_URI).toBe("http://localhost:3000/admin/google/callback");
    });

    it.each(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"] as const)("configurada a medias (falta %s) es un error al arrancar", (falta) => {
      const parcial: Record<string, string> = { ...base, ...google };
      delete parcial[falta];

      expect(mensajeDeError(parcial)).toContain(falta);
    });

    it("la dirección de retorno debe ser una URL http(s)", () => {
      expect(mensajeDeError({ ...base, ...google, GOOGLE_REDIRECT_URI: "javascript:alert(1)" })).toContain("GOOGLE_REDIRECT_URI");
      expect(mensajeDeError({ ...base, ...google, GOOGLE_REDIRECT_URI: "no es una url" })).toContain("GOOGLE_REDIRECT_URI");
    });

    it("en producción la dirección de retorno debe ser https (solo un host local puede ser http)", () => {
      expect(mensajeDeError({ ...produccion, ...google, GOOGLE_REDIRECT_URI: "http://catalogo.ejemplo.com/admin/google/callback" })).toContain(
        "GOOGLE_REDIRECT_URI: en producción debe ser https://",
      );
      expect(() => parseEnv({ ...produccion, ...google, GOOGLE_REDIRECT_URI: "https://catalogo.ejemplo.com/admin/google/callback" })).not.toThrow();
      expect(() => parseEnv({ ...produccion, ...google })).not.toThrow();
    });

    it("el mensaje de error nunca copia el valor recibido (puede ser un secreto)", () => {
      const mensaje = mensajeDeError({ ...base, GOOGLE_CLIENT_SECRET: "GOCSPX-no-debe-aparecer", GOOGLE_CLIENT_ID: "id", GOOGLE_REDIRECT_URI: undefined });

      expect(mensaje).not.toContain("GOCSPX-no-debe-aparecer");
    });

    it("el Google simulado solo se admite fuera de producción", () => {
      expect(parseEnv({ ...base, ...google, GOOGLE_SIMULADO_URL: "http://localhost:4500" }).GOOGLE_SIMULADO_URL).toBe("http://localhost:4500");
      expect(() => parseEnv({ ...base, APP_ENV: "test", ...google, GOOGLE_SIMULADO_URL: "http://localhost:4500" })).not.toThrow();
      expect(mensajeDeError({ ...produccion, ...google, GOOGLE_SIMULADO_URL: "http://localhost:4500" })).toContain("GOOGLE_SIMULADO_URL");
    });

    it("el Google simulado no admite barra final", () => {
      expect(mensajeDeError({ ...base, ...google, GOOGLE_SIMULADO_URL: "http://localhost:4500/" })).toContain("GOOGLE_SIMULADO_URL");
    });
  });
});
