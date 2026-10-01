import { describe, expect, it } from "vitest";
import { generarDocumento } from "@/api/openapi/documento";
import { METODOS_HTTP, fuentesDeProduccion, rutasApi } from "./soporte/fuentes";

// Las únicas operaciones públicas. Agregar una aquí es una decisión de seguridad consciente: toda
// otra ruta debe exigir un token (regla 5) y esta prueba falla si no lo hace.
const PUBLICAS = new Set([
  "GET /health",
  "GET /openapi.json", // solo con Swagger habilitado, es decir, en desarrollo (regla 17)
  "GET /catalogos/ciudades",
  "GET /catalogos/rubros",
  "GET /perfiles",
  "GET /perfiles/{id}",
  "GET /marketplace/productos",
  "GET /marketplace/productos/{id}",
  "POST /auth/login",
  "POST /auth/password/solicitar-codigo",
  "POST /auth/password/restablecer",
]);

// Rutas que existen pero no se documentan a sí mismas (plan, paso 4).
const SIN_OPENAPI = new Set(["/openapi.json"]);

const rutas = rutasApi();
const operaciones = rutas.flatMap((r) => Object.entries(r.manejadores).map(([metodo, texto]) => ({ ...r, metodo, texto, clave: `${metodo} ${r.ruta}` })));
const documento = generarDocumento();

describe("autenticación y autorización de las rutas (regla 5, caja blanca)", () => {
  it("encuentra las rutas de la API (la prueba no es vacía)", () => {
    expect(operaciones.length).toBeGreaterThanOrEqual(30);
  });

  it.each(operaciones.map((o) => [o.clave, o] as const))("%s: está envuelta en withErrorHandling (ningún error interno se filtra)", (_clave, operacion) => {
    expect(operacion.texto).toMatch(/=\s*withErrorHandling\(/);
  });

  it.each(operaciones.filter((o) => !PUBLICAS.has(o.clave)).map((o) => [o.clave, o] as const))(
    "%s: exige un token (requireAuth o requireAdmin)",
    (_clave, operacion) => {
      expect(operacion.texto).toMatch(/require(Auth|Admin)\(/);
    },
  );

  it.each(operaciones.filter((o) => o.ruta.startsWith("/admin/")).map((o) => [o.clave, o] as const))(
    "%s: las rutas de administración exigen el rol Admin (requireAdmin)",
    (_clave, operacion) => {
      expect(operacion.texto).toContain("requireAdmin(");
    },
  );

  it.each(operaciones.filter((o) => PUBLICAS.has(o.clave)).map((o) => [o.clave, o] as const))(
    "%s: una ruta pública no pide token (si lo pide, sobra en la lista de públicas)",
    (_clave, operacion) => {
      expect(operacion.texto).not.toMatch(/require(Auth|Admin)\(/);
    },
  );

  it("la lista de rutas públicas no tiene entradas que ya no existen", () => {
    const existentes = new Set(operaciones.map((o) => o.clave));
    for (const publica of PUBLICAS) expect(existentes.has(publica), publica).toBe(true);
  });

  it.each(
    operaciones
      .filter((o) => !PUBLICAS.has(o.clave) && !o.ruta.startsWith("/admin/") && !o.ruta.startsWith("/auth/"))
      .map((o) => [o.clave, o] as const),
  )("%s: la identidad de quien pide llega al caso de uso (control de dueño, BOLA)", (_clave, operacion) => {
    expect(operacion.texto).toMatch(/actorDe\(usuario\)|usuario\.id/);
  });

  it.each(operaciones.filter((o) => o.ruta.includes("{")).map((o) => [o.clave, o] as const))(
    "%s: valida los parámetros de la ruta con un esquema (id con formato inválido = 400 antes de la base)",
    (_clave, operacion) => {
      expect(operacion.texto).toContain("leerParametrosRuta(");
    },
  );

  it("ninguna ruta lee el cuerpo sin pasar por el validador (leerCuerpo, leerFormulario)", () => {
    for (const fuente of fuentesDeProduccion().filter((f) => f.ruta.startsWith("src/app/"))) {
      expect(fuente.texto, fuente.ruta).not.toMatch(/request\.(json|text|formData|arrayBuffer|blob)\(/);
    }
  });
});

describe("contrato OpenAPI (caja blanca)", () => {
  const documentadas = Object.entries(documento.paths ?? {}).flatMap(([ruta, item]) =>
    METODOS_HTTP.filter((m) => item?.[m.toLowerCase() as "get"]).map((m) => ({ clave: `${m} ${ruta}`, ruta, metodo: m, operacion: item![m.toLowerCase() as "get"]! })),
  );

  it("toda ruta de la API está documentada en OpenAPI", () => {
    const enOpenApi = new Set(documentadas.map((d) => d.clave));
    for (const operacion of operaciones.filter((o) => !SIN_OPENAPI.has(o.ruta))) {
      expect(enOpenApi.has(operacion.clave), `${operacion.clave} no está en OpenAPI`).toBe(true);
    }
  });

  it("toda operación de OpenAPI tiene su ruta implementada (no se documenta lo que no existe)", () => {
    const enCodigo = new Set(operaciones.map((o) => o.clave));
    for (const documentada of documentadas) expect(enCodigo.has(documentada.clave), `${documentada.clave} no tiene ruta`).toBe(true);
  });

  it("la seguridad documentada coincide con la del código: pública = [] y protegida = bearerAuth", () => {
    for (const { clave, operacion } of documentadas) {
      const esperada = PUBLICAS.has(clave) ? [] : [{ bearerAuth: [] }];
      expect(operacion.security, clave).toEqual(esperada);
    }
  });

  it("toda ruta protegida documenta 401 (sin token) y toda ruta de Admin, además, 403", () => {
    for (const { clave, ruta, operacion } of documentadas.filter((d) => !PUBLICAS.has(d.clave))) {
      // El login y el restablecimiento no llevan token; el resto sí.
      expect(Object.keys(operacion.responses ?? {}), clave).toContain("401");
      if (ruta.startsWith("/admin/")) expect(Object.keys(operacion.responses ?? {}), clave).toContain("403");
    }
  });
});
