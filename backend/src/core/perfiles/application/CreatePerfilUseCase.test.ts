import { describe, expect, it } from "vitest";
import { usuarioDePrueba, LoggerFalso } from "@/core/auth/testing/dobles";
import { UsuarioRepositoryEnMemoria } from "@/core/auth/testing/UsuarioRepositoryEnMemoria";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import { CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO } from "@/shared/domain/imagenes";
import { ImageStorageEnMemoria } from "@/shared/infrastructure/ImageStorageEnMemoria";
import { FakeClock } from "@/shared/testing/FakeClock";
import type { Actor } from "../domain/Perfil";
import { PerfilRepositoryEnMemoria, ProcesadorFalso } from "../testing/dobles";
import { CreatePerfilUseCase, type DatosNuevoPerfil } from "./CreatePerfilUseCase";

const AHORA = new Date("2026-09-23T12:00:00Z");
const emprendedora: Actor = { id: "usuario-1", rol: "Emprendedor" };
const admin: Actor = { id: "admin-1", rol: "Admin" };

function construir() {
  const perfiles = new PerfilRepositoryEnMemoria();
  const usuarios = new UsuarioRepositoryEnMemoria([
    usuarioDePrueba({ id: "usuario-1" }),
    usuarioDePrueba({ id: "usuario-2", email: "otra@gmail.com" }),
    usuarioDePrueba({ id: "admin-1", email: "admin@gmail.com", rol: "Admin" }),
  ]);
  const procesador = new ProcesadorFalso();
  const almacenamiento = new ImageStorageEnMemoria();
  const logger = new LoggerFalso();
  const useCase = new CreatePerfilUseCase(perfiles, usuarios, procesador, almacenamiento, new FakeClock(AHORA), logger);
  return { useCase, perfiles, procesador, almacenamiento, logger };
}

const datos = (parches: Partial<DatosNuevoPerfil> = {}): DatosNuevoPerfil => ({
  nombreNegocio: "Dulces de Ana",
  descripcion: "Postres caseros",
  whatsapp: "7123 4567",
  instagram: "@DulcesDeAna",
  ciudadId: "ciudad-1",
  rubroId: "rubro-1",
  foto: Buffer.from("foto"),
  logo: Buffer.from("logo"),
  ...parches,
});

describe("CreatePerfilUseCase", () => {
  it("la emprendedora crea su perfil: sanea WhatsApp e Instagram, procesa y sube las dos imágenes con claves únicas", async () => {
    const { useCase, perfiles, procesador, almacenamiento } = construir();

    const perfil = await useCase.ejecutar(emprendedora, datos());

    expect(perfil).toMatchObject({ usuarioId: "usuario-1", whatsapp: "59171234567", instagramUsername: "dulcesdeana", creadoEn: AHORA });
    expect(perfil.fotoPerfilKey).toMatch(/^perfiles\/.+\.webp$/);
    expect(perfil.logoKey).toMatch(/^logos\/.+\.webp$/);
    expect(procesador.procesados).toEqual([
      { entrada: "foto", tipo: "perfil" },
      { entrada: "logo", tipo: "logo" },
    ]);
    expect(almacenamiento.claves().sort()).toEqual([perfil.fotoPerfilKey, perfil.logoKey].sort());
    expect(perfiles.perfiles).toHaveLength(1);
  });

  it("la otra red social es opcional: sin ella o vacía guarda null, con texto lo recorta", async () => {
    expect((await construir().useCase.ejecutar(emprendedora, datos())).otraRedSocial).toBeNull();
    expect((await construir().useCase.ejecutar(emprendedora, datos({ otraRedSocial: "   " }))).otraRedSocial).toBeNull();
    expect((await construir().useCase.ejecutar(emprendedora, datos({ otraRedSocial: " @tienda_tiktok " }))).otraRedSocial).toBe("@tienda_tiktok");
  });

  it("sin Instagram guarda null", async () => {
    const perfil = await construir().useCase.ejecutar(emprendedora, datos({ instagram: undefined }));

    expect(perfil.instagramUsername).toBeNull();
  });

  describe("imágenes predeterminadas (regla 11)", () => {
    it("con la excepción explícita usa las claves de defaults/ y no sube nada", async () => {
      const { useCase, almacenamiento, procesador } = construir();

      const perfil = await useCase.ejecutar(emprendedora, datos({ foto: "predeterminada", logo: "predeterminada" }));

      expect(perfil.fotoPerfilKey).toBe(CLAVE_FOTO_PERFIL_PREDETERMINADA);
      expect(perfil.logoKey).toBe(CLAVE_LOGO_PREDETERMINADO);
      expect(almacenamiento.claves()).toEqual([]);
      expect(procesador.procesados).toEqual([]);
    });

    it("la foto y el logo son independientes: una predeterminada y la otra subida", async () => {
      const { useCase, almacenamiento } = construir();

      const perfil = await useCase.ejecutar(emprendedora, datos({ foto: "predeterminada" }));

      expect(perfil.fotoPerfilKey).toBe(CLAVE_FOTO_PERFIL_PREDETERMINADA);
      expect(perfil.logoKey).toMatch(/^logos\//);
      expect(almacenamiento.claves()).toEqual([perfil.logoKey]);
    });
  });

  describe("imagen ya procesada (importación desde Drive, regla 22)", () => {
    it("se guarda tal cual, sin pasar otra vez por el procesador (no se recomprime)", async () => {
      const { useCase, procesador, almacenamiento } = construir();

      const perfil = await useCase.ejecutar(emprendedora, datos({ foto: { yaProcesada: Buffer.from("webp-ya-listo") }, logo: "predeterminada" }));

      expect(procesador.procesados).toEqual([]);
      expect(perfil.fotoPerfilKey).toMatch(/^perfiles\/.+\.webp$/);
      expect(perfil.logoKey).toBe(CLAVE_LOGO_PREDETERMINADO);
      expect(almacenamiento.claves()).toEqual([perfil.fotoPerfilKey]);
    });

    it("si el alta falla, la imagen ya procesada que se subió también se borra", async () => {
      const { useCase, almacenamiento } = construir();

      await expect(useCase.ejecutar(emprendedora, datos({ ciudadId: "ciudad-que-no-existe", foto: { yaProcesada: Buffer.from("webp") } }))).rejects.toBeInstanceOf(
        ErrorValidacion,
      );

      expect(almacenamiento.claves()).toEqual([]);
    });
  });

  describe("quién crea el perfil (regla 18)", () => {
    it("un Admin lo crea en nombre de una cuenta Emprendedor", async () => {
      const perfil = await construir().useCase.ejecutar(admin, datos({ usuarioId: "usuario-2" }));

      expect(perfil.usuarioId).toBe("usuario-2");
    });

    it("un Admin sin usuario_id da 400", async () => {
      await expect(construir().useCase.ejecutar(admin, datos())).rejects.toMatchObject({ detalles: [{ campo: "usuario_id" }] });
    });

    it("un Admin sobre una cuenta inexistente da 404", async () => {
      await expect(construir().useCase.ejecutar(admin, datos({ usuarioId: "nadie" }))).rejects.toBeInstanceOf(ErrorNoEncontrado);
    });

    it("un Admin sobre una cuenta Admin da 400 (los Admin no tienen perfil)", async () => {
      await expect(construir().useCase.ejecutar(admin, datos({ usuarioId: "admin-1" }))).rejects.toBeInstanceOf(ErrorValidacion);
    });

    it("una emprendedora no puede crear el perfil de otra (403)", async () => {
      const { useCase, perfiles } = construir();

      await expect(useCase.ejecutar(emprendedora, datos({ usuarioId: "usuario-2" }))).rejects.toBeInstanceOf(ErrorProhibido);

      expect(perfiles.perfiles).toHaveLength(0);
    });

    it("indicar su propio usuario_id es válido", async () => {
      await expect(construir().useCase.ejecutar(emprendedora, datos({ usuarioId: "usuario-1" }))).resolves.toMatchObject({ usuarioId: "usuario-1" });
    });
  });

  describe("un perfil por usuario (regla 6)", () => {
    it("un segundo perfil da 409 antes de procesar ni subir imágenes", async () => {
      const { useCase, procesador, almacenamiento } = construir();
      await useCase.ejecutar(emprendedora, datos());
      const subidas = almacenamiento.claves().length;
      procesador.procesados.length = 0;

      await expect(useCase.ejecutar(emprendedora, datos())).rejects.toBeInstanceOf(ErrorConflicto);

      expect(procesador.procesados).toEqual([]);
      expect(almacenamiento.claves()).toHaveLength(subidas);
    });
  });

  describe("no deja imágenes huérfanas", () => {
    it("una imagen inválida no sube ninguna, ni la primera", async () => {
      const { useCase, almacenamiento } = construir();

      await expect(useCase.ejecutar(emprendedora, datos({ logo: Buffer.from("invalida") }))).rejects.toBeInstanceOf(ErrorValidacion);

      expect(almacenamiento.claves()).toEqual([]);
    });

    it("si el alta falla (ciudad inexistente), borra las dos imágenes ya subidas", async () => {
      const { useCase, almacenamiento, perfiles } = construir();

      await expect(useCase.ejecutar(emprendedora, datos({ ciudadId: "no-existe" }))).rejects.toBeInstanceOf(ErrorValidacion);

      expect(almacenamiento.claves()).toEqual([]);
      expect(perfiles.perfiles).toHaveLength(0);
    });

    it("si falla la subida de la segunda, borra la primera", async () => {
      const { useCase, almacenamiento } = construir();
      const guardarOriginal = almacenamiento.guardar.bind(almacenamiento);
      let llamadas = 0;
      almacenamiento.guardar = async (clave, contenido) => {
        if (++llamadas === 2) throw new Error("R2 caído");
        return guardarOriginal(clave, contenido);
      };

      await expect(useCase.ejecutar(emprendedora, datos())).rejects.toThrow("R2 caído");

      expect(almacenamiento.claves()).toEqual([]);
    });
  });

  it("WhatsApp o Instagram inválidos se rechazan antes de tocar imágenes", async () => {
    const { useCase, procesador } = construir();

    await expect(useCase.ejecutar(emprendedora, datos({ whatsapp: "hola" }))).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(useCase.ejecutar(emprendedora, datos({ instagram: "https://instagram.com/p/abc" }))).rejects.toBeInstanceOf(ErrorValidacion);

    expect(procesador.procesados).toEqual([]);
  });

  it("registra el evento sin WhatsApp, correo ni nombre", async () => {
    const { useCase, logger } = construir();

    await useCase.ejecutar(emprendedora, datos());

    expect(logger.registros.at(-1)).toMatchObject({ evento: "perfil_creado", datos: { usuarioId: "usuario-1", actorId: "usuario-1" } });
    expect(JSON.stringify(logger.registros)).not.toMatch(/59171234567|Dulces|@/);
  });
});
