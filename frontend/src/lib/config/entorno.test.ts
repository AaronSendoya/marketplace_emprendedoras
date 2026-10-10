import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { problemaDeBackendUrl } from "./entorno.ts";

describe("problemaDeBackendUrl", () => {
  it("acepta una URL https en producción y en desarrollo", () => {
    assert.equal(problemaDeBackendUrl("https://api.sitio.com/api/v1", true), null);
    assert.equal(problemaDeBackendUrl("https://api.sitio.com/api/v1", false), null);
  });

  it("en producción rechaza http:// de cualquier host que no sea local", () => {
    for (const valor of ["http://api.sitio.com/api/v1", "http://192.168.1.10:3001/api/v1", "http://localhost.atacante.com/api/v1", "http://127.0.0.1.atacante.com/api/v1"]) {
      assert.match(problemaDeBackendUrl(valor, true) ?? "", /en producción debe ser https/, valor);
    }
  });

  it("en producción acepta http:// solo en localhost y 127.0.0.1 (probar el build en el computador)", () => {
    assert.equal(problemaDeBackendUrl("http://localhost:3001/api/v1", true), null);
    assert.equal(problemaDeBackendUrl("http://127.0.0.1:3001/api/v1", true), null);
  });

  it("en desarrollo acepta http:// en cualquier host", () => {
    assert.equal(problemaDeBackendUrl("http://localhost:3001/api/v1", false), null);
    assert.equal(problemaDeBackendUrl("http://api.sitio.com/api/v1", false), null);
  });

  it("exige un valor, una URL completa http(s), sin barra final y sin credenciales", () => {
    assert.match(problemaDeBackendUrl(undefined, false) ?? "", /es obligatoria/);
    assert.match(problemaDeBackendUrl("   ", true) ?? "", /es obligatoria/);
    assert.match(problemaDeBackendUrl("api.sitio.com/api/v1", false) ?? "", /URL completa/);
    assert.match(problemaDeBackendUrl("ftp://api.sitio.com/api/v1", false) ?? "", /http\(s\)/);
    assert.match(problemaDeBackendUrl("https://api.sitio.com/api/v1/", false) ?? "", /barra/);
    assert.match(problemaDeBackendUrl("https://usuario:clave@api.sitio.com/api/v1", false) ?? "", /usuario ni contraseña/);
  });

  it("nunca copia el valor recibido en el mensaje (puede llevar credenciales)", () => {
    for (const valor of ["https://usuario:clave-secreta@api.sitio.com/api/v1", "http://clave-secreta.com/api/v1", "clave-secreta"]) {
      assert.ok(!(problemaDeBackendUrl(valor, true) ?? "").includes("clave-secreta"), valor);
    }
  });
});
