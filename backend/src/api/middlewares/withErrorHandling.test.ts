import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErrorNoEncontrado } from "@/shared/domain/errors";
import type { ILogger } from "@/shared/domain/ILogger";
import { withErrorHandling } from "./withErrorHandling";

const eventos: string[] = [];
const registro: ILogger = { info: () => {}, warn: () => {}, error: (evento) => eventos.push(evento) };
const peticion = new Request("http://localhost/api/v1/x");

describe("withErrorHandling", () => {
  it("devuelve tal cual la respuesta del manejador y le pasa petición y contexto", async () => {
    const manejador = withErrorHandling(
      (request, contexto: { id: string }) => Response.json({ url: request.url, id: contexto.id }, { status: 201 }),
      registro,
    );

    const respuesta = await manejador(peticion, { id: "7" });

    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toEqual({ url: peticion.url, id: "7" });
  });

  it("convierte un error de dominio, también asíncrono, en la respuesta estándar", async () => {
    const manejador = withErrorHandling(async () => {
      throw new ErrorNoEncontrado("No existe ese perfil.");
    }, registro);

    const respuesta = await manejador(peticion, undefined);

    expect(respuesta.status).toBe(404);
    expect(await respuesta.json()).toEqual({ error: { codigo: "NO_ENCONTRADO", mensaje: "No existe ese perfil." } });
  });

  it("convierte un error de Zod en 400", async () => {
    const manejador = withErrorHandling(() => {
      z.object({ nombre: z.string() }).parse({});
      return Response.json({});
    }, registro);

    expect((await manejador(peticion, undefined)).status).toBe(400);
  });

  it("un error desconocido da 500 genérico y se registra", async () => {
    eventos.length = 0;
    const manejador = withErrorHandling(() => {
      throw new Error("detalle interno secreto");
    }, registro);

    const respuesta = await manejador(peticion, undefined);

    expect(respuesta.status).toBe(500);
    expect(JSON.stringify(await respuesta.json())).not.toContain("secreto");
    expect(eventos).toEqual(["error_no_controlado"]);
  });
});
