import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ErrorArchivoMuyGrande,
  ErrorConflicto,
  ErrorDemasiadasSolicitudes,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorProhibido,
  ErrorValidacion,
} from "@/shared/domain/errors";
import type { ILogger } from "@/shared/domain/ILogger";
import { creado, ok, paginado, respuestaDeError, sinContenido } from "./respuestas";

const registro: { evento: string; datos?: Record<string, unknown> }[] = [];
const logger: ILogger = {
  info: () => {},
  warn: () => {},
  error: (evento, datos) => registro.push({ evento, datos }),
};

describe("respuestaDeError", () => {
  it.each([
    [new ErrorValidacion("x"), 400, "VALIDACION"],
    [new ErrorNoAutenticado(), 401, "NO_AUTENTICADO"],
    [new ErrorProhibido(), 403, "PROHIBIDO"],
    [new ErrorNoEncontrado(), 404, "NO_ENCONTRADO"],
    [new ErrorConflicto("x"), 409, "CONFLICTO"],
    [new ErrorArchivoMuyGrande("x"), 413, "ARCHIVO_MUY_GRANDE"],
    [new ErrorDemasiadasSolicitudes(), 429, "DEMASIADAS_SOLICITUDES"],
  ])("%o responde %i con el código %s", async (error, estado, codigo) => {
    const respuesta = respuestaDeError(error, logger);

    expect(respuesta.status).toBe(estado);
    expect((await respuesta.json()).error).toMatchObject({ codigo, mensaje: error.message });
  });

  it("incluye los detalles solo cuando existen", async () => {
    const detalles = [{ campo: "email", mensaje: "Inválido" }];

    expect((await respuestaDeError(new ErrorValidacion("x", detalles), logger).json()).error.detalles).toEqual(detalles);
    expect((await respuestaDeError(new ErrorConflicto("x"), logger).json()).error).not.toHaveProperty("detalles");
  });

  it("una base de datos fuera de alcance responde 503 con Retry-After y sin el motivo real", async () => {
    const registrado: string[] = [];
    const loggerConAviso: ILogger = { info: () => {}, error: () => {}, warn: (evento) => registrado.push(evento) };
    const error = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:3306 (usuario=root)"), { code: "ECONNREFUSED" });

    const respuesta = respuestaDeError(error, loggerConAviso);
    const texto = await respuesta.text();

    expect(respuesta.status).toBe(503);
    expect(respuesta.headers.get("Retry-After")).toBe("5");
    expect(JSON.parse(texto).error).toEqual({ codigo: "ERROR_INTERNO", mensaje: "El servicio no está disponible por el momento. Inténtalo de nuevo en unos minutos." });
    expect(texto).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|root/);
    expect(registrado).toEqual(["servicio_no_disponible"]);
  });

  it("un error de la consulta (no de conexión) sigue siendo un 500 sin Retry-After", async () => {
    const respuesta = respuestaDeError(Object.assign(new Error("Duplicate entry"), { code: "ER_DUP_ENTRY" }), logger);

    expect(respuesta.status).toBe(500);
    expect(respuesta.headers.has("Retry-After")).toBe(false);
  });

  it("agrega Retry-After cuando se conoce el tiempo de espera", () => {
    expect(respuestaDeError(new ErrorDemasiadasSolicitudes("x", 60), logger).headers.get("Retry-After")).toBe("60");
    expect(respuestaDeError(new ErrorDemasiadasSolicitudes(), logger).headers.has("Retry-After")).toBe(false);
  });

  it("convierte un ZodError en 400 con el detalle por campo", async () => {
    const zod = z.object({ nombre: z.string() }).safeParse({});
    if (zod.success) throw new Error("se esperaba un error de Zod");

    const respuesta = respuestaDeError(zod.error, logger);

    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error.detalles[0].campo).toBe("nombre");
  });

  it("un error desconocido responde 500 sin filtrar detalles y se registra", async () => {
    registro.length = 0;
    const respuesta = respuestaDeError(new Error("conexión a mysql://usuario:clave@host falló"), logger);
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(500);
    expect(cuerpo).toEqual({ error: { codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor." } });
    expect(JSON.stringify(cuerpo)).not.toContain("clave");
    expect(registro).toHaveLength(1);
    expect(registro[0].evento).toBe("error_no_controlado");
  });

  it("los errores de dominio no se registran como fallos", () => {
    registro.length = 0;
    respuestaDeError(new ErrorNoEncontrado(), logger);

    expect(registro).toHaveLength(0);
  });
});

describe("respuestas de éxito", () => {
  it("ok, creado y sinContenido usan 200, 201 y 204", async () => {
    expect(ok({ a: 1 }).status).toBe(200);
    expect(await creado({ a: 1 }).json()).toEqual({ a: 1 });
    expect(creado({}).status).toBe(201);
    expect(sinContenido().status).toBe(204);
  });

  it("paginado devuelve datos y el bloque de paginación", async () => {
    const respuesta = paginado({ datos: [{ id: 1 }], total: 41 }, { pagina: 2, limite: 20 });

    expect(await respuesta.json()).toEqual({ datos: [{ id: 1 }], paginacion: { pagina: 2, limite: 20, total: 41 } });
  });

  it("paginado agrega los campos propios del listado junto a datos y paginacion", async () => {
    const respuesta = paginado({ datos: [], total: 0 }, { pagina: 1, limite: 20 }, { similares: true });

    expect(await respuesta.json()).toEqual({ datos: [], paginacion: { pagina: 1, limite: 20, total: 0 }, similares: true });
  });
});
