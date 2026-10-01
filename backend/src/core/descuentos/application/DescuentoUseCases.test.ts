import { describe, expect, it } from "vitest";
import { LoggerFalso } from "@/core/auth/testing/dobles";
import { perfilDePrueba, PerfilRepositoryEnMemoria } from "@/core/perfiles/testing/dobles";
import { productoDePrueba, ProductoRepositoryEnMemoria } from "@/core/productos/testing/dobles";
import type { Actor } from "@/shared/domain/Actor";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import { descuentoDePrueba, DescuentoRepositoryEnMemoria } from "../testing/dobles";
import {
  AsignarDescuentoAProductoUseCase,
  CreateDescuentoUseCase,
  ListMisDescuentosUseCase,
  QuitarDescuentoDeProductoUseCase,
  UpdateDescuentoUseCase,
} from "./DescuentoUseCases";

const AHORA = new Date("2026-09-23T12:00:00Z");
const duena: Actor = { id: "usuario-1", rol: "Emprendedor" };
const otra: Actor = { id: "usuario-2", rol: "Emprendedor" };
const admin: Actor = { id: "admin-1", rol: "Admin" };

function construir() {
  const perfiles = new PerfilRepositoryEnMemoria([
    perfilDePrueba({ id: "perfil-1", usuarioId: "usuario-1" }),
    perfilDePrueba({ id: "perfil-2", usuarioId: "usuario-2" }),
  ]);
  const descuentos = new DescuentoRepositoryEnMemoria([descuentoDePrueba()]);
  const productos = new ProductoRepositoryEnMemoria([
    productoDePrueba({ id: "producto-1", perfilId: "perfil-1" }),
    productoDePrueba({ id: "producto-2", perfilId: "perfil-1" }),
    productoDePrueba({ id: "producto-ajeno", perfilId: "perfil-2" }),
  ]);
  const clock = new FakeClock(AHORA);
  const logger = new LoggerFalso();
  return {
    descuentos,
    logger,
    crear: new CreateDescuentoUseCase(descuentos, perfiles, clock, logger),
    editar: new UpdateDescuentoUseCase(descuentos, clock, logger),
    listar: new ListMisDescuentosUseCase(descuentos, perfiles, clock),
    asignar: new AsignarDescuentoAProductoUseCase(descuentos, productos, clock, logger),
    quitar: new QuitarDescuentoDeProductoUseCase(descuentos, logger),
  };
}

describe("CreateDescuentoUseCase", () => {
  it("crea un descuento permanente en el perfil de la emprendedora, sin fechas", async () => {
    const { crear } = construir();

    const descuento = await crear.ejecutar(duena, { porcentaje: 20 });

    expect(descuento).toMatchObject({ perfilId: "perfil-1", porcentaje: 20, fechaInicio: null, fechaFin: null, estado: "vigente", productoIds: [] });
  });

  it("el descuento navideño: hoy figura como programado", async () => {
    const descuento = await construir().crear.ejecutar(duena, { porcentaje: 30, fechaInicio: "2026-12-01", fechaFin: "2026-12-31" });

    expect(descuento).toMatchObject({
      fechaInicio: new Date("2026-12-01T04:00:00.000Z"),
      fechaFin: new Date("2027-01-01T03:59:59.000Z"),
      estado: "programado",
    });
  });

  it("uno ya terminado sale como vencido", async () => {
    expect((await construir().crear.ejecutar(duena, { porcentaje: 10, fechaFin: "2026-01-31" })).estado).toBe("vencido");
  });

  it.each([0, -1, 100.5, 12.345])("un porcentaje inválido (%s) da 400", async (porcentaje) => {
    const { crear, descuentos } = construir();

    await expect(crear.ejecutar(duena, { porcentaje })).rejects.toBeInstanceOf(ErrorValidacion);

    expect(descuentos.descuentos).toHaveLength(1);
  });

  it("fecha_fin anterior a fecha_inicio da 400, y una fecha mal escrita también", async () => {
    const { crear } = construir();

    await expect(crear.ejecutar(duena, { porcentaje: 10, fechaInicio: "2026-12-31", fechaFin: "2026-12-01" })).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(crear.ejecutar(duena, { porcentaje: 10, fechaInicio: "pronto" })).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("a qué perfil pertenece: Admin indica perfil_id; la emprendedora no puede usar el de otra; sin perfil, 409", async () => {
    const { crear } = construir();

    await expect(crear.ejecutar(admin, { porcentaje: 10, perfilId: "perfil-2" })).resolves.toMatchObject({ perfilId: "perfil-2" });
    await expect(crear.ejecutar(admin, { porcentaje: 10 })).rejects.toMatchObject({ detalles: [{ campo: "perfil_id" }] });
    await expect(crear.ejecutar(duena, { porcentaje: 10, perfilId: "perfil-2" })).rejects.toBeInstanceOf(ErrorProhibido);
    await expect(crear.ejecutar({ id: "usuario-9", rol: "Emprendedor" }, { porcentaje: 10 })).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("registra el evento sin el porcentaje", async () => {
    const { crear, logger } = construir();

    await crear.ejecutar(duena, { porcentaje: 77 });

    expect(logger.registros.at(-1)).toMatchObject({ evento: "descuento_creado", datos: { perfilId: "perfil-1", actorId: "usuario-1" } });
    expect(JSON.stringify(logger.registros)).not.toContain("77");
  });
});

describe("UpdateDescuentoUseCase (regla 8: no se borra, se termina con fecha_fin)", () => {
  it("cambia el porcentaje sin tocar las fechas", async () => {
    const { crear, editar } = construir();
    const creado = await crear.ejecutar(duena, { porcentaje: 10, fechaInicio: "2026-12-01", fechaFin: "2026-12-31" });

    const editado = await editar.ejecutar(duena, creado.id, { porcentaje: 25 });

    expect(editado).toMatchObject({ porcentaje: 25, fechaInicio: creado.fechaInicio, fechaFin: creado.fechaFin });
  });

  it("terminar un descuento permanente poniéndole fecha_fin en el pasado lo deja vencido", async () => {
    const { editar } = construir();

    const editado = await editar.ejecutar(duena, "descuento-1", { fechaFin: "2026-09-01" });

    expect(editado.estado).toBe("vencido");
  });

  it("null quita una fecha", async () => {
    const { crear, editar } = construir();
    const creado = await crear.ejecutar(duena, { porcentaje: 10, fechaFin: "2026-01-31" });

    const editado = await editar.ejecutar(duena, creado.id, { fechaFin: null });

    expect(editado).toMatchObject({ fechaFin: null, estado: "vigente" });
  });

  it("el rango se valida con lo que quedaría guardado, no solo con lo enviado", async () => {
    const { crear, editar } = construir();
    const creado = await crear.ejecutar(duena, { porcentaje: 10, fechaInicio: "2026-12-01", fechaFin: "2026-12-31" });

    await expect(editar.ejecutar(duena, creado.id, { fechaFin: "2026-11-01" })).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(editar.ejecutar(duena, creado.id, { fechaInicio: "2027-02-01" })).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("un cambio rechazado no modifica nada", async () => {
    const { crear, editar, descuentos } = construir();
    const creado = await crear.ejecutar(duena, { porcentaje: 10, fechaInicio: "2026-12-01", fechaFin: "2026-12-31" });

    await editar.ejecutar(duena, creado.id, { porcentaje: 99, fechaFin: "2026-11-01" }).catch(() => undefined);

    expect(descuentos.descuentos.find((d) => d.id === creado.id)?.porcentaje).toBe(10);
  });

  it("un porcentaje inválido da 400; otra emprendedora, 403; un descuento inexistente, 404; el Admin puede", async () => {
    const { editar } = construir();

    await expect(editar.ejecutar(duena, "descuento-1", { porcentaje: 0 })).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(editar.ejecutar(otra, "descuento-1", { porcentaje: 5 })).rejects.toBeInstanceOf(ErrorProhibido);
    await expect(editar.ejecutar(duena, "nada", { porcentaje: 5 })).rejects.toBeInstanceOf(ErrorNoEncontrado);
    await expect(editar.ejecutar(admin, "descuento-1", { porcentaje: 5 })).resolves.toMatchObject({ porcentaje: 5 });
  });
});

describe("ListMisDescuentosUseCase", () => {
  it("lista los del perfil con su estado calculado; sin perfil, la lista está vacía", async () => {
    const { crear, listar } = construir();
    await crear.ejecutar(duena, { porcentaje: 30, fechaInicio: "2026-12-01", fechaFin: "2026-12-31" });
    await crear.ejecutar(duena, { porcentaje: 5, fechaFin: "2026-01-31" });

    const { datos, total } = await listar.ejecutar("usuario-1", { pagina: 1, limite: 20 });

    expect(total).toBe(3);
    expect(datos.map((d) => d.estado)).toEqual(["vigente", "programado", "vencido"]);
    expect(await listar.ejecutar("usuario-9", { pagina: 1, limite: 20 })).toEqual({ datos: [], total: 0 });
  });
});

describe("AsignarDescuentoAProductoUseCase (regla 9)", () => {
  it("asigna el descuento a productos de su mismo perfil", async () => {
    const { asignar } = construir();

    const descuento = await asignar.ejecutar(duena, "descuento-1", ["producto-1", "producto-2"]);

    expect(descuento.productoIds).toEqual(["producto-1", "producto-2"]);
  });

  it("es idempotente: repetir o duplicar ids no falla ni duplica", async () => {
    const { asignar } = construir();
    await asignar.ejecutar(duena, "descuento-1", ["producto-1"]);

    const descuento = await asignar.ejecutar(duena, "descuento-1", ["producto-1", "producto-1", "producto-2"]);

    expect(descuento.productoIds).toEqual(["producto-1", "producto-2"]);
  });

  it("un producto de otro perfil da 403 y no se asigna ninguno (todo o nada)", async () => {
    const { asignar, descuentos } = construir();

    await expect(asignar.ejecutar(duena, "descuento-1", ["producto-1", "producto-ajeno"])).rejects.toBeInstanceOf(ErrorProhibido);

    expect(descuentos.descuentos[0].productoIds).toEqual([]);
  });

  it("un producto inexistente da 404 y no se asigna ninguno", async () => {
    const { asignar, descuentos } = construir();

    await expect(asignar.ejecutar(duena, "descuento-1", ["producto-1", "nada"])).rejects.toBeInstanceOf(ErrorNoEncontrado);

    expect(descuentos.descuentos[0].productoIds).toEqual([]);
  });

  it("otra emprendedora recibe 403 sobre el descuento; el Admin puede; un descuento inexistente da 404", async () => {
    const { asignar } = construir();

    await expect(asignar.ejecutar(otra, "descuento-1", ["producto-1"])).rejects.toBeInstanceOf(ErrorProhibido);
    await expect(asignar.ejecutar(admin, "descuento-1", ["producto-1"])).resolves.toBeDefined();
    await expect(asignar.ejecutar(duena, "nada", ["producto-1"])).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});

describe("QuitarDescuentoDeProductoUseCase", () => {
  it("quita solo la asignación, sin borrar el descuento, y es idempotente", async () => {
    const { asignar, quitar, descuentos } = construir();
    await asignar.ejecutar(duena, "descuento-1", ["producto-1", "producto-2"]);

    await quitar.ejecutar(duena, "descuento-1", "producto-1");
    await quitar.ejecutar(duena, "descuento-1", "producto-1");

    expect(descuentos.descuentos).toHaveLength(1);
    expect(descuentos.descuentos[0].productoIds).toEqual(["producto-2"]);
  });

  it("otra emprendedora recibe 403 y un descuento inexistente da 404", async () => {
    const { quitar } = construir();

    await expect(quitar.ejecutar(otra, "descuento-1", "producto-1")).rejects.toBeInstanceOf(ErrorProhibido);
    await expect(quitar.ejecutar(duena, "nada", "producto-1")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});
