import { describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import { ImageStorageEnMemoria } from "@/shared/infrastructure/ImageStorageEnMemoria";
import { CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO } from "@/shared/domain/imagenes";
import type { ICachePublica } from "@/shared/domain/ICachePublica";
import { LoggerFalso, usuarioDePrueba } from "../testing/dobles";
import { EliminacionCuentaEnMemoria } from "../testing/EliminacionCuentaEnMemoria";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { EliminarCuentaUseCase } from "./EliminarCuentaUseCase";

const CLAVES = { foto: "perfiles/a.webp", logo: "logos/b.webp", producto1: "productos/c.webp", producto2: "productos/d.webp" };

// Doble de la CDN: recuerda qué direcciones se le pidió purgar y puede fallar a propósito.
class CachePublicaFalsa implements ICachePublica {
  readonly purgadas: string[][] = [];
  falla: Error | null = null;

  async purgar(urls: string[]) {
    if (this.falla) throw this.falla;
    this.purgadas.push(urls);
  }
}

async function construir() {
  const usuarios = new UsuarioRepositoryEnMemoria([
    usuarioDePrueba({ id: "admin-1", email: "admin@gmail.com", rol: "Admin" }),
    usuarioDePrueba({ id: "usuario-1", email: "Aaron@Gmail.com" }),
    usuarioDePrueba({ id: "suspendida-1", email: "suspendida@gmail.com", activo: false }),
    usuarioDePrueba({ id: "otra-1", email: "otra@gmail.com" }),
  ]);
  const eliminacion = new EliminacionCuentaEnMemoria(
    usuarios,
    new Map([
      ["usuario-1", { perfiles: 1, productos: 2, descuentos: 3, clics: 40, clavesImagenes: [CLAVES.foto, CLAVES.logo, CLAVES.producto1, CLAVES.producto2] }],
    ]),
  );
  const almacenamiento = new ImageStorageEnMemoria();
  for (const clave of Object.values(CLAVES)) await almacenamiento.guardar(clave, Buffer.from("x"));
  await almacenamiento.guardar(CLAVE_FOTO_PERFIL_PREDETERMINADA, Buffer.from("x"));
  await almacenamiento.guardar(CLAVE_LOGO_PREDETERMINADO, Buffer.from("x"));
  const logger = new LoggerFalso();
  const cache = new CachePublicaFalsa();
  return { usuarios, eliminacion, almacenamiento, cache, logger, useCase: new EliminarCuentaUseCase(usuarios, eliminacion, almacenamiento, cache, logger) };
}

describe("EliminarCuentaUseCase", () => {
  it("elimina la cuenta, borra sus imágenes de R2 y devuelve cuánto se eliminó", async () => {
    const { usuarios, almacenamiento, useCase } = await construir();

    const resultado = await useCase.ejecutar("admin-1", "usuario-1", "aaron@gmail.com");

    expect(resultado).toEqual({ perfiles: 1, productos: 2, descuentos: 3, clics: 40, imagenes: 4 });
    expect(usuarios.usuarios.map((u) => u.id)).not.toContain("usuario-1");
    for (const clave of Object.values(CLAVES)) expect(almacenamiento.claves()).not.toContain(clave);
  });

  it("la confirmación no distingue mayúsculas ni espacios de más", async () => {
    const { useCase } = await construir();

    await expect(useCase.ejecutar("admin-1", "usuario-1", "  AARON@gmail.COM ")).resolves.toMatchObject({ perfiles: 1 });
  });

  it("nunca borra las imágenes predeterminadas, aunque el perfil las use (regla 11)", async () => {
    const { usuarios, eliminacion, almacenamiento, useCase } = await construir();
    usuarios.usuarios.push(usuarioDePrueba({ id: "sin-fotos", email: "sinfotos@gmail.com" }));
    eliminacion.dependientes.set("sin-fotos", {
      perfiles: 1,
      productos: 0,
      descuentos: 0,
      clics: 0,
      clavesImagenes: [CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO],
    });

    const resultado = await useCase.ejecutar("admin-1", "sin-fotos", "sinfotos@gmail.com");

    expect(resultado.imagenes).toBe(0);
    expect(almacenamiento.claves()).toEqual(expect.arrayContaining([CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO]));
  });

  it("una cuenta sin perfil se elimina sin tocar R2", async () => {
    const { almacenamiento, useCase } = await construir();
    const antes = almacenamiento.claves().length;

    const resultado = await useCase.ejecutar("admin-1", "otra-1", "otra@gmail.com");

    expect(resultado).toEqual({ perfiles: 0, productos: 0, descuentos: 0, clics: 0, imagenes: 0 });
    expect(almacenamiento.claves()).toHaveLength(antes);
  });

  it("registra el evento solo con ids y conteos, nunca con el correo", async () => {
    const { logger, useCase } = await construir();

    await useCase.ejecutar("admin-1", "usuario-1", "aaron@gmail.com");

    expect(logger.registros).toEqual([
      {
        nivel: "info",
        evento: "cuenta_eliminada",
        datos: { usuarioId: "usuario-1", adminId: "admin-1", perfiles: 1, productos: 2, descuentos: 3, clics: 40, imagenes: 4, imagenesNoBorradas: 0, cachePurgada: true },
      },
    ]);
    expect(JSON.stringify(logger.registros)).not.toMatch(/gmail/i);
  });

  it("una cuenta suspendida no se puede eliminar (409): se activa primero", async () => {
    const { usuarios, eliminacion, useCase } = await construir();

    await expect(useCase.ejecutar("admin-1", "suspendida-1", "suspendida@gmail.com")).rejects.toBeInstanceOf(ErrorConflicto);

    expect(eliminacion.eliminadas).toEqual([]);
    expect(usuarios.usuarios.map((u) => u.id)).toContain("suspendida-1");
  });

  it("una cuenta de Admin no se elimina (403)", async () => {
    const { usuarios, useCase } = await construir();
    usuarios.usuarios.push(usuarioDePrueba({ id: "admin-2", email: "admin2@gmail.com", rol: "Admin" }));

    await expect(useCase.ejecutar("admin-1", "admin-2", "admin2@gmail.com")).rejects.toBeInstanceOf(ErrorProhibido);
  });

  it("un Admin no puede eliminar su propia cuenta (409)", async () => {
    const { eliminacion, useCase } = await construir();

    await expect(useCase.ejecutar("admin-1", "admin-1", "admin@gmail.com")).rejects.toBeInstanceOf(ErrorConflicto);

    expect(eliminacion.eliminadas).toEqual([]);
  });

  it("una cuenta que no existe da 404", async () => {
    const { useCase } = await construir();

    await expect(useCase.ejecutar("admin-1", "fantasma", "x@gmail.com")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("si el correo escrito no coincide (400) no se borra nada", async () => {
    const { usuarios, eliminacion, almacenamiento, useCase } = await construir();
    const antes = almacenamiento.claves().length;

    const error = await useCase.ejecutar("admin-1", "usuario-1", "otro@gmail.com").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles?.[0].campo).toBe("confirmacion_email");
    expect(eliminacion.eliminadas).toEqual([]);
    expect(usuarios.usuarios.map((u) => u.id)).toContain("usuario-1");
    expect(almacenamiento.claves()).toHaveLength(antes);
  });

  it("purga de la caché de la CDN las direcciones públicas de las imágenes que se borraron (y solo ésas)", async () => {
    const { cache, useCase } = await construir();

    await useCase.ejecutar("admin-1", "usuario-1", "aaron@gmail.com");

    expect(cache.purgadas).toHaveLength(1);
    expect(cache.purgadas[0].sort()).toEqual(Object.values(CLAVES).map((clave) => `memoria://${clave}`).sort());
  });

  it("no purga las predeterminadas ni llama a la CDN si no hay imágenes propias", async () => {
    const { usuarios, eliminacion, cache, useCase } = await construir();
    usuarios.usuarios.push(usuarioDePrueba({ id: "sin-fotos", email: "sinfotos@gmail.com" }));
    eliminacion.dependientes.set("sin-fotos", { perfiles: 1, productos: 0, descuentos: 0, clics: 0, clavesImagenes: [CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO] });

    await useCase.ejecutar("admin-1", "sin-fotos", "sinfotos@gmail.com");

    expect(cache.purgadas).toEqual([]);
  });

  it("si la CDN no responde, la cuenta igual queda eliminada y el fallo se registra", async () => {
    const { usuarios, cache, logger, useCase } = await construir();
    cache.falla = new Error("Cloudflare no purgó la caché (HTTP 500).");

    const resultado = await useCase.ejecutar("admin-1", "usuario-1", "aaron@gmail.com");

    expect(resultado.imagenes).toBe(4);
    expect(usuarios.usuarios.map((u) => u.id)).not.toContain("usuario-1");
    expect(logger.registros.find((r) => r.evento === "cache_cdn_no_purgada")).toMatchObject({ nivel: "warn", datos: { usuarioId: "usuario-1", imagenes: 4 } });
    expect(logger.registros.find((r) => r.evento === "cuenta_eliminada")?.datos).toMatchObject({ cachePurgada: false });
  });

  it("una imagen que no se pudo borrar de R2 no se purga de la CDN (sigue existiendo)", async () => {
    const { almacenamiento, cache, useCase } = await construir();
    const borrarOriginal = almacenamiento.borrar.bind(almacenamiento);
    almacenamiento.borrar = async (clave: string) => {
      if (clave === CLAVES.logo) throw new Error("R2 no responde");
      return borrarOriginal(clave);
    };

    await useCase.ejecutar("admin-1", "usuario-1", "aaron@gmail.com");

    expect(cache.purgadas[0]).not.toContain(`memoria://${CLAVES.logo}`);
    expect(cache.purgadas[0]).toHaveLength(3);
  });

  it("si la base falla no se borra ninguna imagen de R2 (la cuenta sigue existiendo)", async () => {
    const { eliminacion, almacenamiento, useCase } = await construir();
    const antes = almacenamiento.claves().length;
    eliminacion.falla = new Error("la base de datos falló");

    await expect(useCase.ejecutar("admin-1", "usuario-1", "aaron@gmail.com")).rejects.toThrow("la base de datos falló");

    expect(almacenamiento.claves()).toHaveLength(antes);
  });

  it("si una imagen no se puede borrar, la cuenta igual queda eliminada y el fallo se registra", async () => {
    const { usuarios, almacenamiento, logger, useCase } = await construir();
    const borrarOriginal = almacenamiento.borrar.bind(almacenamiento);
    almacenamiento.borrar = async (clave: string) => {
      if (clave === CLAVES.logo) throw new Error("R2 no responde");
      return borrarOriginal(clave);
    };

    const resultado = await useCase.ejecutar("admin-1", "usuario-1", "aaron@gmail.com");

    expect(resultado.imagenes).toBe(3);
    expect(usuarios.usuarios.map((u) => u.id)).not.toContain("usuario-1");
    expect(logger.registros.find((r) => r.evento === "imagen_cuenta_no_borrada")).toMatchObject({ nivel: "warn", datos: { clave: CLAVES.logo } });
    expect(logger.registros.find((r) => r.evento === "cuenta_eliminada")?.datos).toMatchObject({ imagenes: 3, imagenesNoBorradas: 1 });
  });
});
