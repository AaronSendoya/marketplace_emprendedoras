import { describe, expect, it } from "vitest";
import { LoggerFalso } from "@/core/auth/testing/dobles";
import { ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import type { Actor } from "../domain/Perfil";
import { perfilDePrueba, PerfilRepositoryEnMemoria } from "../testing/dobles";
import { UpdatePerfilUseCase } from "./UpdatePerfilUseCase";

const AHORA = new Date("2026-09-23T12:00:00Z");
const duena: Actor = { id: "usuario-1", rol: "Emprendedor" };

function construir() {
  const perfiles = new PerfilRepositoryEnMemoria([perfilDePrueba()]);
  const logger = new LoggerFalso();
  return { perfiles, logger, useCase: new UpdatePerfilUseCase(perfiles, new FakeClock(AHORA), logger) };
}

describe("UpdatePerfilUseCase", () => {
  it("la dueña cambia solo los campos enviados y se actualiza la fecha", async () => {
    const { useCase } = construir();

    const perfil = await useCase.ejecutar(duena, "perfil-1", { nombreNegocio: "Nuevo nombre", whatsapp: "+591 61234567" });

    expect(perfil).toMatchObject({
      nombreNegocio: "Nuevo nombre",
      whatsapp: "59161234567",
      descripcion: "Postres caseros",
      instagramUsername: "dulcesdeana",
      actualizadoEn: AHORA,
    });
  });

  it("un Admin edita el perfil de cualquiera", async () => {
    const { useCase } = construir();

    await expect(useCase.ejecutar({ id: "admin-1", rol: "Admin" }, "perfil-1", { descripcion: "Editado por Admin" })).resolves.toMatchObject({
      descripcion: "Editado por Admin",
    });
  });

  it("otra emprendedora recibe 403 y no cambia nada", async () => {
    const { useCase, perfiles } = construir();

    await expect(useCase.ejecutar({ id: "usuario-2", rol: "Emprendedor" }, "perfil-1", { nombreNegocio: "Robado" })).rejects.toBeInstanceOf(ErrorProhibido);

    expect(perfiles.perfiles[0].nombreNegocio).toBe("Dulces de Ana");
  });

  it("un perfil inexistente da 404", async () => {
    await expect(construir().useCase.ejecutar(duena, "nada", { nombreNegocio: "x" })).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("instagram null lo quita; un texto se sanea; sin el campo no se toca", async () => {
    const { useCase } = construir();

    expect((await useCase.ejecutar(duena, "perfil-1", { instagram: "https://instagram.com/Otro.Usuario/" })).instagramUsername).toBe("otro.usuario");
    expect((await useCase.ejecutar(duena, "perfil-1", { nombreNegocio: "x" })).instagramUsername).toBe("otro.usuario");
    expect((await useCase.ejecutar(duena, "perfil-1", { instagram: null })).instagramUsername).toBeNull();
  });

  it("otra red social: un texto se recorta, null la quita y sin el campo no se toca", async () => {
    const { useCase } = construir();

    expect((await useCase.ejecutar(duena, "perfil-1", { otraRedSocial: "  @tienda_tiktok " })).otraRedSocial).toBe("@tienda_tiktok");
    expect((await useCase.ejecutar(duena, "perfil-1", { nombreNegocio: "x" })).otraRedSocial).toBe("@tienda_tiktok");
    expect((await useCase.ejecutar(duena, "perfil-1", { otraRedSocial: null })).otraRedSocial).toBeNull();
    await expect(useCase.ejecutar(duena, "perfil-1", { otraRedSocial: "x".repeat(51) })).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("WhatsApp inválido da 400 y no cambia nada", async () => {
    const { useCase, perfiles } = construir();

    await expect(useCase.ejecutar(duena, "perfil-1", { whatsapp: "hola", nombreNegocio: "x" })).rejects.toBeInstanceOf(ErrorValidacion);

    expect(perfiles.perfiles[0].nombreNegocio).toBe("Dulces de Ana");
  });

  it("una ciudad inexistente da 400", async () => {
    await expect(construir().useCase.ejecutar(duena, "perfil-1", { ciudadId: "no-existe" })).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("registra el evento sin datos personales", async () => {
    const { useCase, logger } = construir();

    await useCase.ejecutar(duena, "perfil-1", { whatsapp: "71234567" });

    expect(logger.registros.at(-1)).toEqual({ nivel: "info", evento: "perfil_actualizado", datos: { perfilId: "perfil-1", actorId: "usuario-1" } });
  });
});
