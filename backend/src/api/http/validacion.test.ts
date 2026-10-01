import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErrorValidacion } from "@/shared/domain/errors";
import { esquemaPaginacion } from "./paginacion";
import { leerConsulta, leerCuerpo } from "./validacion";

const esquemaCuerpo = z.object({ nombre: z.string().min(2), edad: z.number().int().optional() }).strict();

const peticion = (cuerpo: string) => new Request("http://localhost/api/v1/x", { method: "POST", body: cuerpo });

const detallesDe = async (promesa: Promise<unknown>) => {
  const error = await promesa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ErrorValidacion);
  return (error as ErrorValidacion).detalles;
};

describe("leerCuerpo", () => {
  it("devuelve el cuerpo validado", async () => {
    expect(await leerCuerpo(peticion('{"nombre":"Ana"}'), esquemaCuerpo)).toEqual({ nombre: "Ana" });
  });

  it("rechaza un JSON mal formado o vacío", async () => {
    await expect(leerCuerpo(peticion("{no es json"), esquemaCuerpo)).rejects.toThrow("JSON válido");
    await expect(leerCuerpo(peticion(""), esquemaCuerpo)).rejects.toThrow("JSON válido");
  });

  it("señala cada campo inválido con su nombre", async () => {
    const detalles = await detallesDe(leerCuerpo(peticion('{"nombre":"A","edad":1.5}'), esquemaCuerpo));

    expect(detalles?.map((d) => d.campo).sort()).toEqual(["edad", "nombre"]);
  });

  it("rechaza campos desconocidos y los nombra (p. ej. `rol`)", async () => {
    const detalles = await detallesDe(leerCuerpo(peticion('{"nombre":"Ana","rol":"Admin"}'), esquemaCuerpo));

    expect(detalles).toEqual([{ campo: "rol", mensaje: "Campo no permitido." }]);
  });

  it("usa `cuerpo` como campo cuando el error es de la raíz", async () => {
    const detalles = await detallesDe(leerCuerpo(peticion("[]"), esquemaCuerpo));

    expect(detalles?.[0].campo).toBe("cuerpo");
  });

  it("los mensajes de Zod salen en español", async () => {
    const detalles = await detallesDe(leerCuerpo(peticion("{}"), esquemaCuerpo));

    expect(detalles?.[0].mensaje).not.toMatch(/Invalid input/);
  });
});

describe("leerConsulta", () => {
  const consulta = (busqueda: string) => new Request(`http://localhost/api/v1/perfiles${busqueda}`);

  it("convierte y completa los parámetros de la URL", () => {
    expect(leerConsulta(consulta("?pagina=2"), esquemaPaginacion)).toEqual({ pagina: 2, limite: 20 });
  });

  it("rechaza parámetros inválidos y usa `consulta` como raíz", () => {
    try {
      leerConsulta(consulta("?limite=999"), esquemaPaginacion);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorValidacion);
      expect((error as ErrorValidacion).detalles?.[0].campo).toBe("limite");
    }
  });
});
