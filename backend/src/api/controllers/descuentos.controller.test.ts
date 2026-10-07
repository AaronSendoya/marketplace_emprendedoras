import { describe, expect, it } from "vitest";
import type { QuitarDescuentoDeProductoUseCase } from "@/core/descuentos/application/DescuentoUseCases";
import { descuentoDePrueba } from "@/core/descuentos/testing/dobles";
import { quitarDescuento, serializarDescuento } from "./descuentos.controller";

describe("serializarDescuento", () => {
  it("devuelve snake_case con fechas ISO en UTC, el estado y los productos; sin datos de la cuenta", () => {
    const cuerpo = serializarDescuento({
      ...descuentoDePrueba({
        fechaInicio: new Date("2026-12-01T04:00:00.000Z"),
        fechaFin: new Date("2027-01-01T03:59:59.000Z"),
        productoIds: ["producto-1"],
      }),
      estado: "programado",
    });

    expect(cuerpo).toEqual({
      id: "descuento-1",
      perfil_id: "perfil-1",
      porcentaje: 15,
      fecha_inicio: "2026-12-01T04:00:00.000Z",
      fecha_fin: "2027-01-01T03:59:59.000Z",
      descripcion: null,
      estado: "programado",
      producto_ids: ["producto-1"],
      creado_en: "2026-09-01T00:00:00.000Z",
    });
    expect(JSON.stringify(cuerpo)).not.toContain("usuario-1");
  });

  it("devuelve el detalle tal cual, y null cuando no tiene", () => {
    expect(serializarDescuento({ ...descuentoDePrueba({ descripcion: "Día de la Madre" }), estado: "vigente" })).toMatchObject({ descripcion: "Día de la Madre" });
    expect(serializarDescuento({ ...descuentoDePrueba(), estado: "vigente" })).toMatchObject({ descripcion: null });
  });

  it("sin fechas devuelve null", () => {
    expect(serializarDescuento({ ...descuentoDePrueba(), estado: "vigente" })).toMatchObject({ fecha_inicio: null, fecha_fin: null });
  });
});

describe("quitarDescuento", () => {
  it("responde 204 sin cuerpo y pasa los ids al caso de uso", async () => {
    let recibido: unknown[] = [];
    const usecase = { ejecutar: async (...args: unknown[]) => void (recibido = args) } as unknown as QuitarDescuentoDeProductoUseCase;

    const respuesta = await quitarDescuento(usecase, { id: "usuario-1", rol: "Emprendedor" }, "descuento-1", "producto-1");

    expect(respuesta.status).toBe(204);
    expect(recibido).toEqual([{ id: "usuario-1", rol: "Emprendedor" }, "descuento-1", "producto-1"]);
  });
});
