import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esTokenSinVencimiento } from "./token.ts";

const codificar = (objeto: unknown) => Buffer.from(JSON.stringify(objeto)).toString("base64url");
const jwt = (cuerpo: unknown) => `${codificar({ alg: "HS256", typ: "JWT" })}.${codificar(cuerpo)}.firma-cualquiera`;

describe("esTokenSinVencimiento", () => {
  it("el token de Emprendedor (sin exp) se renueva", () => {
    assert.equal(esTokenSinVencimiento(jwt({ tv: 0, sub: "11111111-1111-4111-8111-111111111111", iat: 1790000000 })), true);
  });

  it("el token de Admin (con exp) no se renueva", () => {
    assert.equal(esTokenSinVencimiento(jwt({ tv: 0, sub: "u", iat: 1790000000, exp: 1790014400 })), false);
  });

  it("un exp con un valor raro tampoco se renueva", () => {
    assert.equal(esTokenSinVencimiento(jwt({ tv: 0, sub: "u", exp: "mañana" })), false);
    assert.equal(esTokenSinVencimiento(jwt({ tv: 0, sub: "u", exp: null })), false);
  });

  it("lo que no es un JWT legible no se renueva", () => {
    for (const valor of ["", "abc", "a.b", "a.b.c.d", "a..c", "a.%%%.c", `a.${Buffer.from("no es json").toString("base64url")}.c`, jwt([1, 2, 3]), jwt("texto"), jwt(null), jwt(5)]) {
      assert.equal(esTokenSinVencimiento(valor), false, valor);
    }
  });

  it("lee el cuerpo aunque la codificación base64url venga sin relleno", () => {
    const cuerpo = codificar({ tv: 1, sub: "x" });
    assert.ok(!cuerpo.endsWith("="));
    assert.equal(esTokenSinVencimiento(`e30.${cuerpo}.f`), true);
  });
});
