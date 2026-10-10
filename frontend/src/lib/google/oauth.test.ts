import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  desafioPkce,
  desempaquetarInicio,
  empaquetarInicio,
  esCodigoDeGoogle,
  esDireccionLocal,
  esUrlDeAutorizacionValida,
  esValorAleatorio,
  motivoDeFallo,
  MOTIVOS_DE_FALLO,
  sonIguales,
  valorAleatorio,
} from "./oauth.ts";

describe("valorAleatorio", () => {
  it("son 43 caracteres de base64url y no se repite", () => {
    const valores = new Set(Array.from({ length: 50 }, () => valorAleatorio()));
    assert.equal(valores.size, 50);
    for (const valor of valores) {
      assert.match(valor, /^[A-Za-z0-9_-]{43}$/);
      assert.equal(esValorAleatorio(valor), true);
    }
  });
});

describe("desafioPkce", () => {
  it("coincide con el vector de ejemplo del RFC 7636 (apéndice B)", async () => {
    assert.equal(await desafioPkce("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("siempre mide 43 caracteres, la forma que el backend acepta", async () => {
    assert.match(await desafioPkce(valorAleatorio()), /^[A-Za-z0-9_-]{43}$/);
  });
});

describe("sonIguales", () => {
  it("distingue por contenido y por longitud", () => {
    assert.equal(sonIguales("abc", "abc"), true);
    assert.equal(sonIguales("abc", "abd"), false);
    assert.equal(sonIguales("abc", "abcd"), false);
    assert.equal(sonIguales("", ""), true);
  });
});

describe("esCodigoDeGoogle", () => {
  it("acepta un código con barra y guion, como los de Google", () => {
    assert.equal(esCodigoDeGoogle("4/0AX4XfWh-abcdefghijklmnopqrstuvwxyz_0123456789"), true);
  });

  for (const [nombre, valor] of [
    ["vacío", ""],
    ["corto", "abc"],
    ["con espacios", "4/0AX4XfWh abcdefgh"],
    ["con comillas", "4/0AX4XfWh'abcdefgh"],
    ["con un salto de línea", "4/0AX4XfWh\nabcdefgh"],
    ["demasiado largo", `4/${"a".repeat(2100)}`],
    ["no es texto", 12345],
    ["nulo", null],
  ] as const) {
    it(`rechaza un código ${nombre}`, () => {
      assert.equal(esCodigoDeGoogle(valor), false);
    });
  }
});

describe("empaquetarInicio / desempaquetarInicio", () => {
  it("ida y vuelta", () => {
    const state = valorAleatorio();
    const verificador = valorAleatorio();
    assert.deepEqual(desempaquetarInicio(empaquetarInicio(state, verificador)), { state, verificador });
  });

  it("rechaza lo que no tiene la forma", () => {
    for (const valor of [null, undefined, "", "a", "a.b", `${valorAleatorio()}`, `${valorAleatorio()}.${valorAleatorio()}.${valorAleatorio()}`, `${valorAleatorio()}.corto`]) {
      assert.equal(desempaquetarInicio(valor), null, String(valor));
    }
  });
});

describe("esUrlDeAutorizacionValida", () => {
  it("acepta la pantalla de cuentas de Google", () => {
    assert.equal(esUrlDeAutorizacionValida("https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=y", false), true);
  });

  it("en producción no acepta nada más", () => {
    for (const url of [
      "http://accounts.google.com/o/oauth2/v2/auth",
      "https://accounts.google.com.evil.com/o/oauth2/v2/auth",
      "https://evil.com/?https://accounts.google.com",
      "https://usuario:clave@accounts.google.com/o/oauth2/v2/auth",
      "http://localhost:4500/o/oauth2/v2/auth",
      "javascript:alert(1)",
      "//accounts.google.com/o/oauth2",
      "/admin",
      "",
    ]) {
      assert.equal(esUrlDeAutorizacionValida(url, false), false, url);
    }
  });

  it("en desarrollo acepta también localhost (el servidor simulado)", () => {
    assert.equal(esUrlDeAutorizacionValida("http://localhost:4500/o/oauth2/v2/auth?state=x", true), true);
    assert.equal(esUrlDeAutorizacionValida("http://127.0.0.1:4500/o/oauth2/v2/auth", true), true);
    assert.equal(esUrlDeAutorizacionValida("http://localhost.evil.com/o/oauth2/v2/auth", true), false);
  });

  it("lo que no es texto no vale", () => {
    for (const valor of [null, undefined, 5, {}, []]) assert.equal(esUrlDeAutorizacionValida(valor, true), false);
  });
});

describe("esDireccionLocal", () => {
  it("reconoce el computador de desarrollo", () => {
    for (const url of ["http://localhost:3001/api/v1", "http://127.0.0.1:3001", "http://[::1]:3001/api/v1"]) assert.equal(esDireccionLocal(url), true, url);
  });

  it("un dominio público (el hosting) no lo es, aunque lleve «localhost» en el nombre", () => {
    for (const url of ["https://api.midominio.com/api/v1", "https://localhost.midominio.com", "https://midominio.com/localhost", "", "no es una url"]) {
      assert.equal(esDireccionLocal(url), false, url);
    }
    for (const valor of [null, undefined, 3]) assert.equal(esDireccionLocal(valor), false);
  });
});

describe("motivoDeFallo", () => {
  it("devuelve los códigos conocidos", () => {
    for (const codigo of Object.keys(MOTIVOS_DE_FALLO)) assert.equal(motivoDeFallo(codigo), codigo);
  });

  it("lo desconocido (o un nombre de la cadena de prototipos) queda en no_disponible", () => {
    for (const valor of ["hola", "", "toString", "__proto__", "constructor", null, undefined, 3]) assert.equal(motivoDeFallo(valor), "no_disponible");
  });
});
