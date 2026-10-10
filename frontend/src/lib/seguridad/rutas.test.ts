import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rutaDeRetorno } from "./rutas.ts";

describe("rutaDeRetorno", () => {
  it("conserva una ruta del propio panel, con su consulta", () => {
    for (const valor of ["/admin", "/admin?pagina=2", "/admin?q=ana&estado=activo&limite=20&pagina=3", "/admin/nueva", "/admin#lista"]) {
      assert.equal(rutaDeRetorno(valor, "/admin"), valor);
    }
  });

  it("descarta direcciones externas y vuelve al panel", () => {
    for (const valor of [
      "https://atacante.com",
      "http://atacante.com/admin",
      "//atacante.com",
      "//atacante.com/admin",
      "/\\atacante.com",
      "/admin\\..\\atacante.com",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "atacante.com",
      "",
    ]) {
      assert.equal(rutaDeRetorno(valor, "/admin"), "/admin", valor);
    }
  });

  it("descarta rutas que solo se parecen al prefijo", () => {
    for (const valor of ["/administrador", "/admin.atacante.com", "/admin@atacante.com", "/dev", "/", "/mi-negocio"]) {
      assert.equal(rutaDeRetorno(valor, "/admin"), "/admin", valor);
    }
  });

  it("descarta saltos de línea, tabulaciones y caracteres de control", () => {
    for (const valor of ["/admin\r\nLocation: https://atacante.com", "/admin?x=1\n", "/admin\t//atacante.com", "/admin\u0000", "/admin\u007f"]) {
      assert.equal(rutaDeRetorno(valor, "/admin"), "/admin", JSON.stringify(valor));
    }
  });

  it("descarta lo que no es texto o es desmesurado", () => {
    for (const valor of [undefined, null, 5, {}, ["/admin"], `/admin?${"a".repeat(3000)}`]) {
      assert.equal(rutaDeRetorno(valor, "/admin"), "/admin");
    }
  });
});
