import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clasificarError, esSesionVencida, MENSAJES_DE_ERROR, mensajeDeFallo } from "./clasificar.ts";

// La forma de `ErrorApi` (lib/api/cliente.ts): el clasificador la reconoce por sus campos, no por la clase.
const errorApi = (status: number, message = "Mensaje del backend.", codigo = "DESCONOCIDO", retryAfter?: number) =>
  Object.assign(new Error(message), { name: "ErrorApi", status, codigo, retryAfter });

describe("clasificarError: respuestas del backend", () => {
  for (const [status, categoria] of [
    [401, "sesion_vencida"],
    [403, "sin_permiso"],
    [404, "no_encontrado"],
    [409, "conflicto"],
    [400, "validacion"],
    [413, "validacion"],
    [429, "demasiadas_peticiones"],
    [503, "servicio_no_disponible"],
    [504, "tiempo_agotado"],
    [500, "servidor"],
    [502, "servidor"],
  ] as const) {
    it(`el estado ${status} es ${categoria}`, () => {
      assert.equal(clasificarError(errorApi(status)).categoria, categoria);
    });
  }

  it("respeta el mensaje del backend cuando es para la persona (validación, conflicto, permiso, no encontrado)", () => {
    for (const status of [400, 403, 404, 409]) {
      assert.equal(clasificarError(errorApi(status, "El correo escrito no coincide.")).mensaje, "El correo escrito no coincide.");
    }
  });

  it("no copia el mensaje del servidor en un 5xx: usa el propio", () => {
    const c = clasificarError(errorApi(500, "connect ECONNREFUSED 10.0.0.5:3306"));
    assert.equal(c.mensaje, MENSAJES_DE_ERROR.servidor);
    assert.ok(!c.mensaje.includes("ECONNREFUSED"));
  });

  it("los códigos propios del cliente HTTP mandan sobre el estado", () => {
    assert.equal(clasificarError(errorApi(0, "x", "SIN_CONEXION")).categoria, "sin_conexion");
    assert.equal(clasificarError(errorApi(0, "x", "TIEMPO_AGOTADO")).categoria, "tiempo_agotado");
    assert.equal(clasificarError(errorApi(502, "x", "RESPUESTA_INVALIDA")).categoria, "servidor");
  });

  it("critico y reintentable: lo que impide cargar la página es crítico; un dato mal escrito no", () => {
    assert.deepEqual(
      ["servidor", "servicio_no_disponible", "sin_conexion"].map((c) => [c, true]),
      [errorApi(500), errorApi(503), errorApi(0, "x", "SIN_CONEXION")].map((e) => [clasificarError(e).categoria, clasificarError(e).critico]),
    );
    const validacion = clasificarError(errorApi(400));
    assert.equal(validacion.critico, false);
    assert.equal(validacion.reintentable, false);
    assert.equal(clasificarError(errorApi(401)).critico, false);
    assert.equal(clasificarError(errorApi(429, "x", "DEMASIADAS_SOLICITUDES", 12)).reintentable, true);
  });

  it("devuelve cuánto esperar cuando el servidor lo pide", () => {
    assert.equal(clasificarError(errorApi(429, "x", "DEMASIADAS_SOLICITUDES", 11.2)).esperarSegundos, 12);
    assert.equal(clasificarError(errorApi(500)).esperarSegundos, null);
    assert.equal(clasificarError(errorApi(429, "x", "DEMASIADAS_SOLICITUDES", -3)).esperarSegundos, null);
  });
});

describe("clasificarError: fallos antes de tener respuesta", () => {
  it("el tiempo agotado de fetch (TimeoutError y AbortError)", () => {
    for (const name of ["TimeoutError", "AbortError"]) {
      const error = Object.assign(new Error("The operation was aborted due to timeout"), { name });
      assert.equal(clasificarError(error).categoria, "tiempo_agotado");
    }
  });

  it("fetch sin red, de Node y de los navegadores", () => {
    for (const mensaje of ["fetch failed", "Failed to fetch", "NetworkError when attempting to fetch resource.", "Load failed"]) {
      assert.equal(clasificarError(new TypeError(mensaje)).categoria, "sin_conexion", mensaje);
    }
  });

  it("el código de red que deja undici, también envuelto en `cause`", () => {
    const interno = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    assert.equal(clasificarError(interno).categoria, "sin_conexion");
    assert.equal(clasificarError(new Error("otra cosa", { cause: interno })).categoria, "sin_conexion");
  });

  it("lo demás es desconocido y nunca lanza, venga lo que venga", () => {
    for (const valor of [null, undefined, 3, "texto", {}, [], new Error("boom"), Symbol("x")]) {
      const c = clasificarError(valor);
      assert.equal(c.categoria, "desconocido", String(valor));
      assert.equal(c.mensaje, MENSAJES_DE_ERROR.desconocido);
    }
  });

  it("un `cause` circular no cuelga", () => {
    const a: Record<string, unknown> = {};
    a.cause = { cause: a };
    assert.equal(clasificarError(a).categoria, "desconocido");
  });
});

describe("atajos", () => {
  it("mensajeDeFallo y esSesionVencida", () => {
    assert.equal(mensajeDeFallo(errorApi(503)), MENSAJES_DE_ERROR.servicio_no_disponible);
    assert.equal(esSesionVencida(errorApi(401)), true);
    assert.equal(esSesionVencida(errorApi(403)), false);
  });
});
