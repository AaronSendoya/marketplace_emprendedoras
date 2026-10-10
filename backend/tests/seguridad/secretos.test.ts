import { describe, expect, it } from "vitest";
import { fuentesDeProduccion, leer } from "./soporte/fuentes";

// Regla 17: los secretos viven solo en variables de entorno, nunca en el repositorio.
const PATRONES_DE_SECRETO: [string, RegExp][] = [
  ["clave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["clave de acceso de AWS/R2", /\bAKIA[0-9A-Z]{16}\b/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["hash bcrypt", /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/],
  ["token de GitHub", /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ["secreto de cliente de Google", /\bGOCSPX-[A-Za-z0-9_-]{20,}/],
  ["token de acceso de Google", /\bya29\.[A-Za-z0-9_-]{20,}/],
  ["token de Slack o Stripe", /\b(xox[baprs]-[A-Za-z0-9-]{10,}|sk_(live|test)_[A-Za-z0-9]{16,})/],
  ["contraseña dentro de una URL de conexión", /mysql:\/\/[^:\s/]+:(?!clave\b|CLAVE|TU_CLAVE|p@|p\b|\$\{|\.\.\.)[^@\s/]{3,}@/],
];

// Único hash permitido en el código: el de una contraseña que nunca se usa (LoginUseCase) para que
// el tiempo de respuesta no delate si un correo existe.
const HASH_PERMITIDO = /LoginUseCase\.ts$/;

// Ficheros que se versionan y podrían contener un secreto.
const RAIZ_VERSIONADA = ["package.json", "next.config.ts", ".env.example", "docs/PLAN_IMPLEMENTACION_BACKEND.md", "docs/ENTORNO_LOCAL.md", "docs/entorno-local.sql", "CLAUDE.md"];

describe("secretos (regla 17, caja blanca)", () => {
  it.each(fuentesDeProduccion().map((f) => [f.ruta, f] as const))("%s: no contiene secretos", (ruta, fuente) => {
    for (const [nombre, patron] of PATRONES_DE_SECRETO) {
      if (nombre === "hash bcrypt" && HASH_PERMITIDO.test(ruta)) continue;
      expect(patron.test(fuente.texto), `${ruta} parece contener: ${nombre}`).toBe(false);
    }
  });

  it.each(RAIZ_VERSIONADA.map((r) => [r] as const))("%s: no contiene secretos", (ruta) => {
    const texto = leer(ruta);
    for (const [nombre, patron] of PATRONES_DE_SECRETO) {
      expect(patron.test(texto), `${ruta} parece contener: ${nombre}`).toBe(false);
    }
  });

  it(".env.example solo trae valores de ejemplo: las variables secretas van vacías o con un marcador", () => {
    const secretas = ["JWT_SECRET", "R2_SECRET_ACCESS_KEY", "R2_ACCESS_KEY_ID", "SMTP_PASS", "SMTP_USER", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
    for (const nombre of secretas) {
      const linea = leer(".env.example")
        .split("\n")
        .find((l) => l.startsWith(`${nombre}=`));
      expect(linea, `falta ${nombre} en .env.example`).toBeDefined();
      expect(linea!.slice(nombre.length + 1).trim(), `${nombre} no debe traer un valor real`).toBe("");
    }
  });

  it(".env.example: la cadena de la base usa marcadores (usuario/clave), no credenciales reales", () => {
    const lineas = leer(".env.example").split("\n").filter((l) => /^DATABASE_URL(_TEST)?=/.test(l));

    expect(lineas.length).toBeGreaterThanOrEqual(2);
    for (const linea of lineas) expect(linea).toMatch(/mysql:\/\/usuario:clave@/);
  });

  // El .gitignore es único y vive en la raíz del repositorio (market_Pista8/), un nivel por encima de
  // backend/, que es donde corren las pruebas; por eso los patrones propios del backend llevan /backend/.
  it(".gitignore excluye los .env (salvo el ejemplo), el seed con la contraseña de desarrollo, los reportes de migración y el esquema local", () => {
    const ignorados = leer("../.gitignore").split("\n").map((l) => l.trim());

    expect(ignorados).toContain(".env*");
    expect(ignorados).toContain("!.env.example");
    expect(ignorados).toContain("/backend/docs/seed.dev.sql");
    expect(ignorados).toContain("/backend/reports/");
    expect(ignorados).toContain("/backend/docs/schema.reference.sql");
  });

  it("el código lee las credenciales solo del entorno validado (env.ts), no de process.env suelto", () => {
    const permitidos = /^src\/(shared\/config\/env\.ts|instrumentation\.ts)$/;
    for (const fuente of fuentesDeProduccion().filter((f) => !permitidos.test(f.ruta))) {
      expect(fuente.texto, `${fuente.ruta} lee process.env directamente; usa getEnv()`).not.toMatch(/process\.env\.(JWT_SECRET|DATABASE_URL|R2_|SMTP_)/);
    }
  });

  it("el JWT_SECRET solo se usa para firmar y verificar (JwtTokenService)", () => {
    const usos = fuentesDeProduccion().filter((f) => f.texto.includes("JWT_SECRET") && !/env\.ts$/.test(f.ruta));

    expect(usos.map((f) => f.ruta)).toEqual(["src/core/auth/infrastructure/JwtTokenService.ts"]);
  });
});
