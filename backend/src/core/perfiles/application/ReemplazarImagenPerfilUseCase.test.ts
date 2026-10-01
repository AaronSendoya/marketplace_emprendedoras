import { describe, expect, it } from "vitest";
import { LoggerFalso } from "@/core/auth/testing/dobles";
import { ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import { CLAVE_FOTO_PERFIL_PREDETERMINADA, CLAVE_LOGO_PREDETERMINADO } from "@/shared/domain/imagenes";
import { ImageStorageEnMemoria } from "@/shared/infrastructure/ImageStorageEnMemoria";
import { FakeClock } from "@/shared/testing/FakeClock";
import type { Actor } from "../domain/Perfil";
import { perfilDePrueba, PerfilRepositoryEnMemoria, ProcesadorFalso } from "../testing/dobles";
import { ReemplazarImagenPerfilUseCase } from "./ReemplazarImagenPerfilUseCase";

const duena: Actor = { id: "usuario-1", rol: "Emprendedor" };

async function construir(parches = {}) {
  const perfiles = new PerfilRepositoryEnMemoria([perfilDePrueba(parches)]);
  const almacenamiento = new ImageStorageEnMemoria();
  await almacenamiento.guardar("perfiles/foto-vieja.webp", Buffer.from("vieja"));
  await almacenamiento.guardar("logos/logo-viejo.webp", Buffer.from("logo viejo"));
  const logger = new LoggerFalso();
  const useCase = new ReemplazarImagenPerfilUseCase(perfiles, new ProcesadorFalso(), almacenamiento, new FakeClock(new Date("2026-09-23T12:00:00Z")), logger);
  return { useCase, perfiles, almacenamiento, logger };
}

describe("ReemplazarImagenPerfilUseCase", () => {
  it("reemplaza la foto: sube la nueva, actualiza la clave y borra la anterior, sin tocar el logo", async () => {
    const { useCase, almacenamiento } = await construir();

    const perfil = await useCase.ejecutar(duena, "perfil-1", "perfil", Buffer.from("nueva"));

    expect(perfil.fotoPerfilKey).toMatch(/^perfiles\/.+\.webp$/);
    expect(perfil.fotoPerfilKey).not.toBe("perfiles/foto-vieja.webp");
    expect(perfil.logoKey).toBe("logos/logo-viejo.webp");
    expect(almacenamiento.claves().sort()).toEqual([perfil.fotoPerfilKey, "logos/logo-viejo.webp"].sort());
  });

  it("reemplaza el logo sin tocar la foto", async () => {
    const { useCase, almacenamiento } = await construir();

    const perfil = await useCase.ejecutar(duena, "perfil-1", "logo", Buffer.from("nuevo"));

    expect(perfil.logoKey).toMatch(/^logos\//);
    expect(perfil.fotoPerfilKey).toBe("perfiles/foto-vieja.webp");
    expect(almacenamiento.existe("logos/logo-viejo.webp")).toBe(false);
    expect(almacenamiento.existe("perfiles/foto-vieja.webp")).toBe(true);
  });

  it("con la excepción explícita pasa a la predeterminada y borra la anterior subida", async () => {
    const { useCase, almacenamiento } = await construir();

    const perfil = await useCase.ejecutar(duena, "perfil-1", "logo", "predeterminada");

    expect(perfil.logoKey).toBe(CLAVE_LOGO_PREDETERMINADO);
    expect(almacenamiento.existe("logos/logo-viejo.webp")).toBe(false);
  });

  it("una imagen predeterminada anterior nunca se borra (es compartida)", async () => {
    const { useCase, almacenamiento } = await construir({ fotoPerfilKey: CLAVE_FOTO_PERFIL_PREDETERMINADA });
    await almacenamiento.guardar(CLAVE_FOTO_PERFIL_PREDETERMINADA, Buffer.from("anonima"));

    await useCase.ejecutar(duena, "perfil-1", "perfil", Buffer.from("nueva"));

    expect(almacenamiento.existe(CLAVE_FOTO_PERFIL_PREDETERMINADA)).toBe(true);
  });

  it("una imagen inválida no cambia nada ni borra la anterior", async () => {
    const { useCase, perfiles, almacenamiento } = await construir();

    await expect(useCase.ejecutar(duena, "perfil-1", "perfil", Buffer.from("invalida"))).rejects.toBeInstanceOf(ErrorValidacion);

    expect(perfiles.perfiles[0].fotoPerfilKey).toBe("perfiles/foto-vieja.webp");
    expect(almacenamiento.claves()).toHaveLength(2);
  });

  it("si falla guardar el cambio, borra la imagen nueva y conserva la anterior", async () => {
    const { useCase, perfiles, almacenamiento } = await construir();
    perfiles.falloAlActualizar = true;

    await expect(useCase.ejecutar(duena, "perfil-1", "perfil", Buffer.from("nueva"))).rejects.toThrow("fallo de la base");

    expect(almacenamiento.claves().sort()).toEqual(["logos/logo-viejo.webp", "perfiles/foto-vieja.webp"]);
  });

  it("si no se puede borrar la anterior, el reemplazo igual se completa y se registra un aviso", async () => {
    const { useCase, almacenamiento, logger } = await construir();
    almacenamiento.borrar = async () => Promise.reject(new Error("R2 caído"));

    const perfil = await useCase.ejecutar(duena, "perfil-1", "perfil", Buffer.from("nueva"));

    expect(perfil.fotoPerfilKey).not.toBe("perfiles/foto-vieja.webp");
    expect(logger.registros.map((r) => r.evento)).toContain("imagen_anterior_no_borrada");
  });

  it("otra emprendedora recibe 403, un Admin puede y un perfil inexistente da 404", async () => {
    const { useCase } = await construir();

    await expect(useCase.ejecutar({ id: "usuario-2", rol: "Emprendedor" }, "perfil-1", "perfil", Buffer.from("x"))).rejects.toBeInstanceOf(ErrorProhibido);
    await expect(useCase.ejecutar({ id: "admin-1", rol: "Admin" }, "perfil-1", "perfil", Buffer.from("x"))).resolves.toBeDefined();
    await expect(useCase.ejecutar(duena, "nada", "perfil", Buffer.from("x"))).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});
