import { describe, expect, it } from "vitest";
import { LoggerFalso } from "@/core/auth/testing/dobles";
import { perfilDePrueba, PerfilRepositoryEnMemoria, ProcesadorFalso } from "@/core/perfiles/testing/dobles";
import type { Actor } from "@/shared/domain/Actor";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import { ImageStorageEnMemoria } from "@/shared/infrastructure/ImageStorageEnMemoria";
import { FakeClock } from "@/shared/testing/FakeClock";
import { ProductoRepositoryEnMemoria } from "../testing/dobles";
import { CreateProductoUseCase, type DatosNuevoProducto } from "./CreateProductoUseCase";

const AHORA = new Date("2026-09-23T12:00:00Z");
const duena: Actor = { id: "usuario-1", rol: "Emprendedor" };
const admin: Actor = { id: "admin-1", rol: "Admin" };

function construir(perfiles = [perfilDePrueba({ id: "perfil-1", usuarioId: "usuario-1" }), perfilDePrueba({ id: "perfil-2", usuarioId: "usuario-2" })]) {
  const productos = new ProductoRepositoryEnMemoria();
  const almacenamiento = new ImageStorageEnMemoria();
  const procesador = new ProcesadorFalso();
  const logger = new LoggerFalso();
  const useCase = new CreateProductoUseCase(productos, new PerfilRepositoryEnMemoria(perfiles), procesador, almacenamiento, new FakeClock(AHORA), logger);
  return { useCase, productos, almacenamiento, procesador, logger };
}

const datos = (parches: Partial<DatosNuevoProducto> = {}): DatosNuevoProducto => ({ nombre: "Torta", imagen: Buffer.from("imagen"), ...parches });

describe("CreateProductoUseCase", () => {
  it("la emprendedora crea el producto en su perfil: procesa como producto, sube con clave única y muestra el precio por defecto", async () => {
    const { useCase, productos, almacenamiento, procesador } = construir();

    const producto = await useCase.ejecutar(duena, datos({ precio: 25.5, descripcion: "Rica" }));

    expect(producto).toMatchObject({ perfilId: "perfil-1", nombre: "Torta", descripcion: "Rica", precio: 25.5, mostrarPrecio: true, activo: true, creadoEn: AHORA });
    expect(producto.imagenKey).toMatch(/^productos\/.+\.webp$/);
    expect(procesador.procesados).toEqual([{ entrada: "imagen", tipo: "producto" }]);
    expect(almacenamiento.claves()).toEqual([producto.imagenKey]);
    expect(productos.productos).toHaveLength(1);
  });

  it("el precio y la descripción son opcionales (sin precio aparece \"Consultar Precio\")", async () => {
    const producto = await construir().useCase.ejecutar(duena, datos());

    expect(producto).toMatchObject({ precio: null, descripcion: null });
  });

  it("un precio 0 es válido; mostrarPrecio false se respeta", async () => {
    const producto = await construir().useCase.ejecutar(duena, datos({ precio: 0, mostrarPrecio: false }));

    expect(producto).toMatchObject({ precio: 0, mostrarPrecio: false });
  });

  it.each([-1, 12.345, 100_000_000])("un precio inválido (%s) da 400 antes de procesar la imagen", async (precio) => {
    const { useCase, procesador, almacenamiento } = construir();

    await expect(useCase.ejecutar(duena, datos({ precio }))).rejects.toBeInstanceOf(ErrorValidacion);

    expect(procesador.procesados).toEqual([]);
    expect(almacenamiento.claves()).toEqual([]);
  });

  describe("a qué perfil pertenece (regla 18)", () => {
    it("un Admin indica el perfil", async () => {
      const producto = await construir().useCase.ejecutar(admin, datos({ perfilId: "perfil-2" }));

      expect(producto.perfilId).toBe("perfil-2");
    });

    it("un Admin sin perfil_id da 400; con uno inexistente, 404", async () => {
      const { useCase } = construir();

      await expect(useCase.ejecutar(admin, datos())).rejects.toMatchObject({ detalles: [{ campo: "perfil_id" }] });
      await expect(useCase.ejecutar(admin, datos({ perfilId: "nada" }))).rejects.toBeInstanceOf(ErrorNoEncontrado);
    });

    it("una emprendedora sin perfil recibe 409 (primero debe crearlo)", async () => {
      await expect(construir([]).useCase.ejecutar(duena, datos())).rejects.toBeInstanceOf(ErrorConflicto);
    });

    it("una emprendedora no puede crear productos en el perfil de otra (403)", async () => {
      const { useCase, productos } = construir();

      await expect(useCase.ejecutar(duena, datos({ perfilId: "perfil-2" }))).rejects.toBeInstanceOf(ErrorProhibido);

      expect(productos.productos).toHaveLength(0);
    });

    it("indicar su propio perfil_id es válido", async () => {
      await expect(construir().useCase.ejecutar(duena, datos({ perfilId: "perfil-1" }))).resolves.toMatchObject({ perfilId: "perfil-1" });
    });
  });

  it("una imagen inválida no crea nada", async () => {
    const { useCase, productos, almacenamiento } = construir();

    await expect(useCase.ejecutar(duena, datos({ imagen: Buffer.from("invalida") }))).rejects.toBeInstanceOf(ErrorValidacion);

    expect(productos.productos).toHaveLength(0);
    expect(almacenamiento.claves()).toEqual([]);
  });

  it("si falla el alta, borra la imagen ya subida", async () => {
    const { useCase, productos, almacenamiento } = construir();
    productos.crear = async () => Promise.reject(new Error("fallo de la base"));

    await expect(useCase.ejecutar(duena, datos())).rejects.toThrow("fallo de la base");

    expect(almacenamiento.claves()).toEqual([]);
  });

  it("registra el evento sin nombre ni precio", async () => {
    const { useCase, logger } = construir();

    await useCase.ejecutar(duena, datos({ nombre: "Secreta", precio: 77 }));

    expect(logger.registros.at(-1)).toMatchObject({ evento: "producto_creado", datos: { perfilId: "perfil-1", actorId: "usuario-1" } });
    expect(JSON.stringify(logger.registros)).not.toMatch(/Secreta|77/);
  });
});
