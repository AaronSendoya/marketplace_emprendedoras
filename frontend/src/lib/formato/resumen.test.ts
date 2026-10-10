import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resumirTexto } from "./resumen.ts";

describe("resumirTexto", () => {
  it("conserva todas las letras, también la «s» (un error de expresión regular las borró una vez)", () => {
    assert.equal(resumirTexto("Repostería artesanal boliviana: tortas, alfajores y bocaditos"), "Repostería artesanal boliviana: tortas, alfajores y bocaditos");
  });

  it("colapsa espacios, tabulaciones y saltos de línea", () => {
    assert.equal(resumirTexto("  Hola \n\n  mundo\t\tcruel  "), "Hola mundo cruel");
  });

  it("no toca un texto que cabe", () => {
    assert.equal(resumirTexto("a".repeat(160)), "a".repeat(160));
  });

  it("corta en una palabra completa y añade «...» sin pasar del máximo", () => {
    const texto = "palabra ".repeat(40);
    const resumen = resumirTexto(texto, 160);
    assert.ok(resumen.length <= 160);
    assert.ok(resumen.endsWith("palabra..."), resumen.slice(-20));
  });

  it("una sola palabra larguísima se corta seco", () => {
    const resumen = resumirTexto("x".repeat(500), 160);
    assert.equal(resumen.length, 160);
    assert.ok(resumen.endsWith("..."));
  });

  it("sin texto devuelve una cadena vacía", () => {
    assert.equal(resumirTexto(null), "");
    assert.equal(resumirTexto(undefined), "");
    assert.equal(resumirTexto("   \n  "), "");
  });
});
