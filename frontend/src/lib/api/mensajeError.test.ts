import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mensajeDeError, MENSAJE_VALIDACION_GENERAL } from "./mensajeError.ts";

describe("mensajeDeError", () => {
  it("con el mensaje general, muestra el motivo exacto de cada campo (lo que el backend manda en `detalles`)", () => {
    assert.equal(
      mensajeDeError(MENSAJE_VALIDACION_GENERAL, [{ mensaje: "El precio debe ser 0 o más, con hasta 2 decimales." }], 400),
      "El precio debe ser 0 o más, con hasta 2 decimales.",
    );
  });

  it("junta varios motivos, sin repetir y con un máximo de tres", () => {
    const detalles = [{ mensaje: "El nombre debe tener al menos 3 caracteres." }, { mensaje: "El nombre debe tener al menos 3 caracteres." }, { mensaje: "El precio es inválido." }, { mensaje: "Falta la imagen." }, { mensaje: "Un cuarto motivo." }];
    assert.equal(mensajeDeError(MENSAJE_VALIDACION_GENERAL, detalles, 400), "El nombre debe tener al menos 3 caracteres. El precio es inválido. Falta la imagen.");
  });

  it("un mensaje propio del backend se respeta tal cual, aunque haya detalles", () => {
    assert.equal(mensajeDeError("El archivo no es un .xlsx.", [{ mensaje: "otra cosa" }], 400), "El archivo no es un .xlsx.");
    assert.equal(mensajeDeError("La fecha de fin debe ser posterior a la de inicio.", [{ mensaje: "La fecha de fin debe ser posterior a la de inicio." }], 400), "La fecha de fin debe ser posterior a la de inicio.");
  });

  it("sin detalles útiles queda el mensaje general, y sin nada, el estado HTTP", () => {
    assert.equal(mensajeDeError(MENSAJE_VALIDACION_GENERAL, undefined, 400), MENSAJE_VALIDACION_GENERAL);
    assert.equal(mensajeDeError(MENSAJE_VALIDACION_GENERAL, [], 400), MENSAJE_VALIDACION_GENERAL);
    assert.equal(mensajeDeError(MENSAJE_VALIDACION_GENERAL, [{ mensaje: "   " }], 400), MENSAJE_VALIDACION_GENERAL);
    assert.equal(mensajeDeError(undefined, undefined, 502), "El servidor respondió 502.");
  });
});
