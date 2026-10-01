import { describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorNoEncontrado } from "@/shared/domain/errors";
import { LoggerFalso, usuarioDePrueba } from "../testing/dobles";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { ActualizarUsuarioUseCase } from "./ActualizarUsuarioUseCase";

function construir() {
  const repo = new UsuarioRepositoryEnMemoria([
    usuarioDePrueba({ id: "admin-1", email: "admin@gmail.com", rol: "Admin" }),
    usuarioDePrueba({ id: "usuario-1", emailVerificadoEn: new Date("2026-01-01T00:00:00Z") }),
  ]);
  const logger = new LoggerFalso();
  return { repo, logger, useCase: new ActualizarUsuarioUseCase(repo, logger) };
}

describe("ActualizarUsuarioUseCase", () => {
  it("edita nombres y apellidos sin tocar el correo ni su verificación", async () => {
    const { repo, useCase } = construir();

    const usuario = await useCase.ejecutar("admin-1", "usuario-1", { nombres: "Aarón", apellidoPaterno: "Mamani Quispe" });

    expect(usuario).toMatchObject({ nombres: "Aarón", apellidoPaterno: "Mamani Quispe" });
    expect(repo.usuarios[1].emailVerificadoEn).toEqual(new Date("2026-01-01T00:00:00Z"));
  });

  it("un cuerpo vacío no cambia nada", async () => {
    const { repo, useCase } = construir();
    const antes = { ...repo.usuarios[1] };

    await useCase.ejecutar("admin-1", "usuario-1", {});

    expect(repo.usuarios[1]).toEqual(antes);
  });

  it("null en apellido_materno lo quita (regla 10)", async () => {
    const { useCase } = construir();

    const usuario = await useCase.ejecutar("admin-1", "usuario-1", { apellidoMaterno: null });

    expect(usuario.apellidoMaterno).toBeNull();
  });

  it("cambiar el correo lo deja sin verificar hasta el próximo OTP (regla 15)", async () => {
    const { useCase } = construir();

    const usuario = await useCase.ejecutar("admin-1", "usuario-1", { email: "nuevo@gmail.com" });

    expect(usuario.email).toBe("nuevo@gmail.com");
    expect(usuario.emailVerificadoEn).toBeNull();
  });

  it("reenviar el mismo correo no toca la verificación", async () => {
    const { useCase } = construir();

    const usuario = await useCase.ejecutar("admin-1", "usuario-1", { email: "aaron@gmail.com" });

    expect(usuario.emailVerificadoEn).toEqual(new Date("2026-01-01T00:00:00Z"));
  });

  it("un correo que ya tiene otra cuenta da conflicto", async () => {
    const { useCase } = construir();

    await expect(useCase.ejecutar("admin-1", "usuario-1", { email: "admin@gmail.com" })).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("una cuenta que no existe da 404", async () => {
    const { useCase } = construir();

    await expect(useCase.ejecutar("admin-1", "no-existe", { nombres: "X" })).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("registra el evento sin datos personales", async () => {
    const { useCase, logger } = construir();

    await useCase.ejecutar("admin-1", "usuario-1", { email: "otro@gmail.com", nombres: "Otro Nombre" });

    expect(logger.registros).toEqual([{ nivel: "info", evento: "cuenta_editada", datos: { usuarioId: "usuario-1", adminId: "admin-1" } }]);
  });
});
