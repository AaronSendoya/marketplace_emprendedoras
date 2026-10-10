import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esUuid, idDeParametro, PAGINA_MAXIMA, paginaDeParametro, ultimaPagina } from "./parametros.ts";

describe("paginaDeParametro", () => {
  it("acepta un entero entre 1 y el máximo del backend", () => {
    assert.equal(paginaDeParametro("1"), 1);
    assert.equal(paginaDeParametro("7"), 7);
    assert.equal(paginaDeParametro(String(PAGINA_MAXIMA)), PAGINA_MAXIMA);
  });

  it("todo lo que el backend rechazaría (400) es la primera página", () => {
    for (const texto of ["", "abc", "0", "-1", "-5", "1.5", "1e3", "0x10", " 2", "2 ", "+3", "100001", "999999", "9999999", "12abc", "NaN", "Infinity"]) {
      assert.equal(paginaDeParametro(texto), 1, JSON.stringify(texto));
    }
  });

  it("un cero a la izquierda sigue siendo la misma página", () => {
    assert.equal(paginaDeParametro("007"), 7);
  });
});

describe("ultimaPagina", () => {
  it("redondea hacia arriba y nunca baja de una", () => {
    assert.equal(ultimaPagina(0, 12), 1);
    assert.equal(ultimaPagina(1, 12), 1);
    assert.equal(ultimaPagina(12, 12), 1);
    assert.equal(ultimaPagina(13, 12), 2);
    assert.equal(ultimaPagina(240, 24), 10);
    assert.equal(ultimaPagina(241, 24), 11);
  });
});

describe("esUuid e idDeParametro", () => {
  const V4 = "00000000-0000-4000-8000-000000000000";
  const V1_DE_MYSQL = "5a0a0dca-c396-11f1-a1b6-40c2ba97707a";

  it("acepta los UUID que el backend acepta: v4 de la aplicación, v1 de MySQL, mayúsculas, nil y max", () => {
    for (const id of [V4, V1_DE_MYSQL, V1_DE_MYSQL.toUpperCase(), "00000000-0000-0000-0000-000000000000", "ffffffff-ffff-ffff-ffff-ffffffffffff", crypto.randomUUID()]) {
      assert.equal(esUuid(id), true, id);
      assert.equal(idDeParametro(id), id);
    }
  });

  it("rechaza lo que el backend rechaza, incluida una versión o una variante imposibles", () => {
    for (const id of ["", "zzz", "123", "00000000-0000-0000-0000-00000000000a", "5a0a0dca-c396-11f1-c1b6-40c2ba97707a", `${V4} `, ` ${V4}`, `${V4}x`, "'; DROP TABLE perfiles;--", "%00", "../../etc/passwd"]) {
      assert.equal(esUuid(id), false, JSON.stringify(id));
      assert.equal(idDeParametro(id), "", JSON.stringify(id));
    }
  });
});
