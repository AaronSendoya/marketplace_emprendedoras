import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CABECERAS_ESTATICAS, construirCsp, generarNonce } from "./csp.ts";

const NONCE = "YWJjZGVmZ2hpamtsbW5vcA==";

function directiva(csp: string, nombre: string): string[] {
  const encontrada = csp.split("; ").find((parte) => parte.startsWith(`${nombre} `));
  assert.ok(encontrada, `falta la directiva ${nombre}`);
  return encontrada.slice(nombre.length + 1).split(" ");
}

describe("generarNonce", () => {
  it("es base64 de 128 bits", () => {
    const nonce = generarNonce();

    assert.match(nonce, /^[A-Za-z0-9+/]{22}==$/);
    assert.equal(Buffer.from(nonce, "base64").length, 16);
  });

  it("no se repite entre peticiones", () => {
    const vistos = new Set(Array.from({ length: 2000 }, () => generarNonce()));

    assert.equal(vistos.size, 2000);
  });
});

describe("construirCsp", () => {
  const produccion = construirCsp({ nonce: NONCE, desarrollo: false });

  it("los scripts solo se ejecutan con el nonce de la petición, sin 'unsafe-inline' ni 'unsafe-eval'", () => {
    const scripts = directiva(produccion, "script-src");

    assert.deepEqual(scripts, ["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"]);
  });

  it("impide meter el sitio en un iframe, plugins y cambiar la base de las direcciones o el destino de los formularios", () => {
    assert.deepEqual(directiva(produccion, "frame-ancestors"), ["'none'"]);
    assert.deepEqual(directiva(produccion, "object-src"), ["'none'"]);
    assert.deepEqual(directiva(produccion, "base-uri"), ["'self'"]);
    assert.deepEqual(directiva(produccion, "form-action"), ["'self'"]);
    assert.deepEqual(directiva(produccion, "default-src"), ["'self'"]);
  });

  it("img-src admite las imágenes de R2 (https), la previsualización local (blob:) y data:, y nada de http:", () => {
    assert.deepEqual(directiva(produccion, "img-src"), ["'self'", "https:", "data:", "blob:"]);
  });

  it("connect-src solo admite el propio sitio en producción", () => {
    assert.deepEqual(directiva(produccion, "connect-src"), ["'self'"]);
  });

  it("los estilos admiten atributos style (React y los gráficos) pero nunca estilos de otro origen", () => {
    assert.deepEqual(directiva(produccion, "style-src"), ["'self'", "'unsafe-inline'"]);
  });

  it("no usa comodines ni 'unsafe-inline' en scripts", () => {
    assert.ok(!/\*/.test(produccion));
    assert.ok(!directiva(produccion, "script-src").includes("'unsafe-inline'"));
  });

  it("en desarrollo suma lo que exigen React y el servidor de desarrollo", () => {
    const desarrollo = construirCsp({ nonce: NONCE, desarrollo: true });

    assert.ok(directiva(desarrollo, "script-src").includes("'unsafe-eval'"));
    assert.ok(directiva(desarrollo, "connect-src").includes("ws:"));
    assert.ok(directiva(desarrollo, "img-src").includes("http:"));
    assert.deepEqual(directiva(desarrollo, "frame-ancestors"), ["'none'"]);
  });

  it("rechaza un nonce que pueda alterar la cabecera", () => {
    for (const nonce of ["", "corto", "abc; script-src *", "a'b".padEnd(24, "x"), `${NONCE}\r\nSet-Cookie: x=1`, "YWJj ZGVmZ2hpamtsbW5vcA=="]) {
      assert.throws(() => construirCsp({ nonce, desarrollo: false }), /Nonce de CSP inválido/);
    }
  });
});

describe("CABECERAS_ESTATICAS", () => {
  const porNombre = new Map(CABECERAS_ESTATICAS.map(({ key, value }) => [key, value]));

  it("lleva las cabeceras de la regla 17", () => {
    assert.equal(porNombre.get("X-Content-Type-Options"), "nosniff");
    assert.equal(porNombre.get("X-Frame-Options"), "DENY");
    assert.equal(porNombre.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.match(porNombre.get("Permissions-Policy") ?? "", /camera=\(\).*microphone=\(\).*geolocation=\(\)/);
  });

  it("HSTS dura un año y no obliga a los subdominios ni entra en la lista de precarga", () => {
    assert.equal(porNombre.get("Strict-Transport-Security"), "max-age=31536000");
  });

  it("no repite ninguna cabecera", () => {
    assert.equal(porNombre.size, CABECERAS_ESTATICAS.length);
  });
});
