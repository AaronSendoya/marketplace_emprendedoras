import { describe, expect, it } from "vitest";
import { LoggerFalso } from "@/core/auth/testing/dobles";
import { ProcesadorFalso } from "@/core/perfiles/testing/dobles";
import type { Actor } from "@/shared/domain/Actor";
import { ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import { ImageStorageEnMemoria } from "@/shared/infrastructure/ImageStorageEnMemoria";
import { FakeClock } from "@/shared/testing/FakeClock";
import { productoDePrueba, ProductoRepositoryEnMemoria } from "../testing/dobles";
import { DeactivateProductoUseCase, ReemplazarImagenProductoUseCase, UpdateProductoUseCase } from "./GestionProductoUseCases";

const AHORA = new Date("2026-09-23T12:00:00Z");
const duena: Actor = { id: "usuario-1", rol: "Emprendedor" };
const otra: Actor = { id: "usuario-2", rol: "Emprendedor" };
const admin: Actor = { id: "admin-1", rol: "Admin" };

function construir() {
  const productos = new ProductoRepositoryEnMemoria([productoDePrueba()]);
  const logger = new LoggerFalso();
  const clock = new FakeClock(AHORA);
  return {
    productos,
    logger,
    actualizar: new UpdateProductoUseCase(productos, clock, logger),
    desactivar: new DeactivateProductoUseCase(productos, clock, logger),
  };
}

describe("UpdateProductoUseCase", () => {
  it("la dueña cambia solo los campos enviados y se actualiza la fecha", async () => {
    const { actualizar } = construir();

    const producto = await actualizar.ejecutar(duena, "producto-1", { nombre: "Torta grande", precio: 150 });

    expect(producto).toMatchObject({ nombre: "Torta grande", precio: 150, descripcion: "Con cobertura", mostrarPrecio: true, actualizadoEn: AHORA });
  });

  it("precio null quita el precio; descripción null la quita; mostrarPrecio oculta el precio real", async () => {
    const { actualizar } = construir();

    expect(await actualizar.ejecutar(duena, "producto-1", { mostrarPrecio: false })).toMatchObject({ precio: 100, mostrarPrecio: false });
    expect(await actualizar.ejecutar(duena, "producto-1", { precio: null, descripcion: null })).toMatchObject({ precio: null, descripcion: null });
  });

  it("activo:true reactiva un producto desactivado", async () => {
    const { actualizar, desactivar } = construir();
    await desactivar.ejecutar(duena, "producto-1");

    expect((await actualizar.ejecutar(duena, "producto-1", { activo: true })).activo).toBe(true);
  });

  it("un Admin edita productos ajenos; otra emprendedora recibe 403 y no cambia nada; uno inexistente da 404", async () => {
    const { actualizar, productos } = construir();

    await expect(actualizar.ejecutar(admin, "producto-1", { nombre: "Por Admin" })).resolves.toMatchObject({ nombre: "Por Admin" });
    await expect(actualizar.ejecutar(otra, "producto-1", { nombre: "Robado" })).rejects.toBeInstanceOf(ErrorProhibido);
    await expect(actualizar.ejecutar(duena, "nada", { nombre: "x" })).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(productos.productos[0].nombre).toBe("Por Admin");
  });

  it("un precio inválido da 400 y no cambia nada", async () => {
    const { actualizar, productos } = construir();

    await expect(actualizar.ejecutar(duena, "producto-1", { nombre: "x", precio: -3 })).rejects.toBeInstanceOf(ErrorValidacion);

    expect(productos.productos[0].nombre).toBe("Torta de chocolate");
  });
});

describe("DeactivateProductoUseCase (soft delete, regla 7)", () => {
  it("desactiva sin borrar el producto y registra el evento", async () => {
    const { desactivar, productos, logger } = construir();

    await desactivar.ejecutar(duena, "producto-1");

    expect(productos.productos).toHaveLength(1);
    expect(productos.productos[0].activo).toBe(false);
    expect(logger.registros.at(-1)).toEqual({ nivel: "info", evento: "producto_desactivado", datos: { productoId: "producto-1", actorId: "usuario-1" } });
  });

  it("es idempotente: repetirlo no registra otro evento", async () => {
    const { desactivar, logger } = construir();
    await desactivar.ejecutar(duena, "producto-1");

    await desactivar.ejecutar(duena, "producto-1");

    expect(logger.registros).toHaveLength(1);
  });

  it("otra emprendedora recibe 403, el Admin puede y un producto inexistente da 404", async () => {
    const { desactivar } = construir();

    await expect(desactivar.ejecutar(otra, "producto-1")).rejects.toBeInstanceOf(ErrorProhibido);
    await expect(desactivar.ejecutar(duena, "nada")).rejects.toBeInstanceOf(ErrorNoEncontrado);
    await expect(desactivar.ejecutar(admin, "producto-1")).resolves.toBeUndefined();
  });
});

describe("ReemplazarImagenProductoUseCase", () => {
  async function construirImagen() {
    const productos = new ProductoRepositoryEnMemoria([productoDePrueba()]);
    const almacenamiento = new ImageStorageEnMemoria();
    await almacenamiento.guardar("productos/vieja.webp", Buffer.from("vieja"));
    const logger = new LoggerFalso();
    const useCase = new ReemplazarImagenProductoUseCase(productos, new ProcesadorFalso(), almacenamiento, new FakeClock(AHORA), logger);
    return { useCase, productos, almacenamiento, logger };
  }

  it("sube la nueva, actualiza la clave y borra la anterior", async () => {
    const { useCase, almacenamiento } = await construirImagen();

    const producto = await useCase.ejecutar(duena, "producto-1", Buffer.from("nueva"));

    expect(producto.imagenKey).toMatch(/^productos\/.+\.webp$/);
    expect(producto.imagenKey).not.toBe("productos/vieja.webp");
    expect(almacenamiento.claves()).toEqual([producto.imagenKey]);
  });

  it("una imagen inválida no cambia nada ni borra la anterior", async () => {
    const { useCase, almacenamiento, productos } = await construirImagen();

    await expect(useCase.ejecutar(duena, "producto-1", Buffer.from("invalida"))).rejects.toBeInstanceOf(ErrorValidacion);

    expect(productos.productos[0].imagenKey).toBe("productos/vieja.webp");
    expect(almacenamiento.claves()).toEqual(["productos/vieja.webp"]);
  });

  it("si falla guardar el cambio, borra la nueva y conserva la anterior", async () => {
    const { useCase, productos, almacenamiento } = await construirImagen();
    productos.falloAlActualizar = true;

    await expect(useCase.ejecutar(duena, "producto-1", Buffer.from("nueva"))).rejects.toThrow("fallo de la base");

    expect(almacenamiento.claves()).toEqual(["productos/vieja.webp"]);
  });

  it("si no puede borrar la anterior, el reemplazo igual se completa y se registra un aviso", async () => {
    const { useCase, almacenamiento, logger } = await construirImagen();
    almacenamiento.borrar = async () => Promise.reject(new Error("R2 caído"));

    await expect(useCase.ejecutar(duena, "producto-1", Buffer.from("nueva"))).resolves.toBeDefined();

    expect(logger.registros.map((r) => r.evento)).toContain("imagen_anterior_no_borrada");
  });

  it("otra emprendedora recibe 403 y un producto inexistente da 404", async () => {
    const { useCase } = await construirImagen();

    await expect(useCase.ejecutar(otra, "producto-1", Buffer.from("x"))).rejects.toBeInstanceOf(ErrorProhibido);
    await expect(useCase.ejecutar(duena, "nada", Buffer.from("x"))).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});
