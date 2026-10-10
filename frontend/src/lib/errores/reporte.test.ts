import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { claveDeReporte, redactar, rutaSinDatos, sanitizarReporte } from "./reporte.ts";

describe("redactar", () => {
  it("quita correos, tokens, identificadores y números largos", () => {
    const texto =
      "Falló para ana.perez@gmail.com con Bearer abc.DEF-123_456 y ya29.a0AfH6SMBx-token_de.prueba en 0f7d3b6a-1111-4a2b-8c3d-9e0f1a2b3c4d tel 59171234567";
    const limpio = redactar(texto, 500);
    assert.ok(!limpio.includes("ana.perez"));
    assert.ok(!limpio.includes("abc.DEF"));
    assert.ok(!limpio.includes("ya29."));
    assert.ok(!limpio.includes("0f7d3b6a"));
    assert.ok(!limpio.includes("59171234567"));
    assert.match(limpio, /\[correo\]/);
    assert.match(limpio, /\[id\]/);
  });

  it("quita un JWT completo y una cadena larga sin forma conocida", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJ0diI6MCwic3ViIjoiOTllNTA1OGMifQ.firma_de_prueba_123";
    assert.ok(!redactar(`token ${jwt}`).includes("eyJhbGci"));
    assert.ok(!redactar(`clave ${"a".repeat(40)}`).includes("a".repeat(32)));
  });

  it("no deja saltos de línea ni caracteres de control: una línea del registro es un evento", () => {
    const limpio = redactar("línea uno\n{\"evento\":\"falso\"}\r\n\u0000fin");
    assert.ok(!/[\n\r\u0000]/.test(limpio));
  });

  it("recorta lo largo con puntos suspensivos", () => {
    const limpio = redactar("palabra ".repeat(200), 50);
    assert.equal(limpio.length, 50);
    assert.ok(limpio.endsWith("…"));
  });
});

describe("rutaSinDatos", () => {
  it("quita la consulta, el fragmento y los identificadores", () => {
    assert.equal(rutaSinDatos("/admin/emprendimientos/0f7d3b6a-1111-4a2b-8c3d-9e0f1a2b3c4d?q=ana%40gmail.com#x"), "/admin/emprendimientos/:id");
    assert.equal(rutaSinDatos("/emprendedoras?q=maria"), "/emprendedoras");
    assert.equal(rutaSinDatos("/productos/123456"), "/productos/:id");
  });

  it("lo que no es una ruta cae en «/»", () => {
    for (const valor of [null, undefined, 4, {}]) assert.equal(rutaSinDatos(valor), "/");
  });

  it("limita el largo y quita caracteres de control", () => {
    assert.ok(rutaSinDatos(`/${"a".repeat(500)}`).length <= 160);
    assert.ok(!/[\n\r]/.test(rutaSinDatos("/uno\ndos")));
  });
});

describe("sanitizarReporte", () => {
  const valido = { origen: "pagina", contexto: "ErrorGlobal", mensaje: "Algo falló", digest: "1234567890", ruta: "/admin?x=1", pila: "Error: x\n at y" };

  it("acepta un reporte bien formado y lo deja limpio", () => {
    const r = sanitizarReporte({ ...valido, mensaje: "Falló para ana@gmail.com" });
    assert.ok(r);
    assert.equal(r.origen, "pagina");
    assert.equal(r.mensaje, "Falló para [correo]");
    assert.equal(r.ruta, "/admin");
    assert.equal(r.digest, "1234567890");
  });

  it("descarta lo que no tiene la forma, sin lanzar", () => {
    for (const entrada of [null, undefined, "x", 3, [], {}, { origen: "otro", mensaje: "x" }, { origen: "pagina" }, { origen: "pagina", mensaje: 5 }]) {
      assert.equal(sanitizarReporte(entrada), null);
    }
  });

  it("un digest con caracteres raros se descarta, y los campos de más no pasan", () => {
    const r = sanitizarReporte({ ...valido, digest: "<script>", cookie: "sesion=abc", extra: { a: 1 } });
    assert.ok(r);
    assert.equal(r.digest, null);
    assert.deepEqual(Object.keys(r).sort(), ["contexto", "digest", "mensaje", "origen", "pila", "ruta"]);
  });

  it("la clave de repetidos junta lo que es «el mismo» error", () => {
    const a = sanitizarReporte(valido)!;
    const b = sanitizarReporte({ ...valido, pila: "otra pila" })!;
    const c = sanitizarReporte({ ...valido, digest: "otro-digest" })!;
    assert.equal(claveDeReporte(a), claveDeReporte(b));
    assert.notEqual(claveDeReporte(a), claveDeReporte(c));
  });
});
