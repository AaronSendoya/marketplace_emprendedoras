import { z } from "zod";

type EnvSource = Record<string, string | undefined>;

const requerida = () =>
  z.string({
    error: (iss) => (iss.input === undefined ? "es obligatoria" : "debe ser texto"),
  });

const esOrigen = (valor: string) => {
  try {
    return new URL(valor).origin === valor;
  } catch {
    return false;
  }
};

const origenHttp = z
  .url({ protocol: /^https?$/, error: "debe ser una URL http(s)" })
  .refine(esOrigen, "debe ser solo el origen, sin ruta ni barra final (ej. https://sitio.com)");

// Regla 1: sin comodines. Cada origen se compara tal cual contra la cabecera Origin.
const listaOrigenes = requerida()
  .transform((valor) =>
    valor
      .split(",")
      .map((origen) => origen.trim())
      .filter(Boolean),
  )
  .pipe(z.array(origenHttp).min(1, "debe tener al menos un origen"));

const urlSinBarraFinal = z
  .url({ protocol: /^https?$/, error: "debe ser una URL http(s)" })
  .refine((valor) => !valor.endsWith("/"), "no debe terminar en barra");

// Cadena mysql://usuario:clave@host:3306/base. El mensaje no incluye el valor recibido (puede
// llevar la contraseña).
const cadenaMySql = requerida().regex(
  /^mysql:\/\/[^\s/]+\/[^\s?]+/,
  "debe ser una cadena de conexión mysql://usuario:clave@host:3306/base",
);

const R2_CLAVES = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

// Purga de la caché de la CDN al borrar imágenes (regla 5). Van juntas o ninguna; en producción son obligatorias.
const CLOUDFLARE_CLAVES = ["CLOUDFLARE_ZONE_ID", "CLOUDFLARE_API_TOKEN"] as const;

const SMTP_CLAVES = ["EMAIL_FROM", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"] as const;

const envSchema = z
  .object({
    // Sin valor por defecto a propósito: el seed se apoya en este valor para negarse a correr
    // fuera de desarrollo, y un valor por omisión lo dejaría correr en producción.
    APP_ENV: z.enum(["development", "test", "production"], {
      error: (iss) =>
        iss.input === undefined
          ? "es obligatoria (development, test o production)"
          : "debe ser development, test o production",
    }),

    DATABASE_URL: cadenaMySql,
    // Hostinger limita las conexiones simultáneas por usuario: el pool se mantiene pequeño.
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
    DATABASE_URL_TEST: cadenaMySql.optional(),

    JWT_SECRET: requerida().min(32, "debe tener al menos 32 caracteres"),
    CORS_ALLOWED_ORIGINS: listaOrigenes,
    // Cerrado por defecto: la documentación solo se expone si se pide de forma explícita.
    SWAGGER_ENABLED: z
      .enum(["true", "false"], { error: 'debe ser "true" o "false"' })
      .default("false")
      .transform((valor) => valor === "true"),

    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PUBLIC_URL: urlSinBarraFinal.optional(),

    CLOUDFLARE_ZONE_ID: z.string().optional(),
    CLOUDFLARE_API_TOKEN: z.string().optional(),

    EMAIL_DRIVER: z.enum(["console", "smtp"], { error: "debe ser console o smtp" }).default("console"),
    EMAIL_FROM: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const r2Presentes = R2_CLAVES.filter((clave) => env[clave] !== undefined);
    const r2Incompleto = r2Presentes.length < R2_CLAVES.length;
    // R2 llega en el paso 10b: antes puede faltar entero, pero configurado a medias siempre es un error.
    if (r2Incompleto && (r2Presentes.length > 0 || env.APP_ENV === "production")) {
      for (const clave of R2_CLAVES.filter((c) => env[c] === undefined)) {
        ctx.addIssue({
          code: "custom",
          path: [clave],
          message: "es obligatoria (R2 se configura completo y es obligatorio en producción)",
        });
      }
    }

    // Sin la purga, una imagen borrada seguiría sirviéndose desde la caché de la CDN: configurada a medias siempre es un error y
    // en producción es obligatoria (regla 5).
    const cfPresentes = CLOUDFLARE_CLAVES.filter((clave) => env[clave] !== undefined);
    if (cfPresentes.length < CLOUDFLARE_CLAVES.length && (cfPresentes.length > 0 || env.APP_ENV === "production")) {
      for (const clave of CLOUDFLARE_CLAVES.filter((c) => env[c] === undefined)) {
        ctx.addIssue({
          code: "custom",
          path: [clave],
          message: "es obligatoria (la purga de la caché de la CDN se configura completa y es obligatoria en producción)",
        });
      }
    }

    // Swagger solo en desarrollo (regla 17): fuera de él, habilitarlo es un error de configuración.
    if (env.SWAGGER_ENABLED && env.APP_ENV !== "development") {
      ctx.addIssue({
        code: "custom",
        path: ["SWAGGER_ENABLED"],
        message: "solo puede ser true con APP_ENV=development (Swagger no se expone fuera de desarrollo)",
      });
    }

    // El adaptador de consola escribiría los códigos OTP en los logs del servidor (regla 15).
    if (env.APP_ENV === "production" && env.EMAIL_DRIVER === "console") {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_DRIVER"],
        message: "en producción debe ser smtp (console escribe los códigos en los logs)",
      });
    }

    if (env.EMAIL_DRIVER === "smtp") {
      for (const clave of SMTP_CLAVES.filter((c) => env[c] === undefined)) {
        ctx.addIssue({
          code: "custom",
          path: [clave],
          message: "es obligatoria cuando EMAIL_DRIVER=smtp",
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

// Segundo control (el primero es el arranque): aunque la variable llegara a ser true, fuera de
// desarrollo /docs y /api/v1/openapi.json responden 404 (regla 17).
export const swaggerHabilitado = (env: Pick<Env, "SWAGGER_ENABLED" | "APP_ENV">): boolean =>
  env.SWAGGER_ENABLED && env.APP_ENV === "development";

export class EnvError extends Error {
  constructor(detalles: string[]) {
    super(
      ["Configuración de entorno inválida. Revisa .env.local (referencia: .env.example):", ...detalles]
        .join("\n  - "),
    );
    this.name = "EnvError";
  }
}

const formatearRuta = (ruta: PropertyKey[]) =>
  ruta.map((parte) => (typeof parte === "number" ? `[${parte}]` : String(parte))).join(".");

// Las variables vacías (`CLAVE=`) cuentan como ausentes: así .env.example se puede copiar tal cual.
const sinVacias = (fuente: EnvSource): EnvSource =>
  Object.fromEntries(Object.entries(fuente).filter(([, valor]) => valor?.trim()));

export function parseEnv(fuente: EnvSource): Env {
  const resultado = envSchema.safeParse(sinVacias(fuente));
  if (!resultado.success) {
    // Solo ruta y mensaje: nunca el valor recibido, porque puede ser un secreto.
    throw new EnvError(
      resultado.error.issues.map((problema) => `${formatearRuta(problema.path)}: ${problema.message}`),
    );
  }
  return resultado.data;
}

let cache: Env | undefined;

export function getEnv(): Env {
  cache ??= parseEnv(process.env);
  return cache;
}
