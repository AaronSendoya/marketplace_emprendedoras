import { describe, expect, it } from "vitest";
import { ErrorNoEncontrado, ErrorValidacion } from "@/shared/domain/errors";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { hasherFalso, LoggerFalso, usuarioDePrueba } from "../testing/dobles";
import { AdminRestablecerPasswordUseCase } from "./AdminRestablecerPasswordUseCase";

function construir() {
  const repo = new UsuarioRepositoryEnMemoria([
    usuarioDePrueba({ id: "admin-1", email: "admin@gmail.com", rol: "Admin" }),
    usuarioDePrueba({ id: "usuario-1", tokenVersion: 3 }),
  ]);
  const logger = new LoggerFalso();
  const useCase = new AdminRestablecerPasswordUseCase(repo, hasherFalso, logger, () => "TempPass2026");
  return { repo, logger, useCase };
}

describe("AdminRestablecerPasswordUseCase", () => {
  it("con una contraseña elegida, la guarda y no devuelve ninguna temporal", async () => {
    const { repo, useCase } = construir();

    const { usuario, passwordTemporal } = await useCase.ejecutar("admin-1", "usuario-1", "ClaveNueva2026");

    expect(usuario.passwordHash).toBe("hash-de-ClaveNueva2026");
    expect(passwordTemporal).toBeNull();
    expect(repo.usuarios[1].passwordHash).toBe("hash-de-ClaveNueva2026");
  });

  it("sin contraseña, genera una temporal, guarda su hash y la devuelve esa única vez", async () => {
    const { useCase } = construir();

    const { usuario, passwordTemporal } = await useCase.ejecutar("admin-1", "usuario-1");

    expect(passwordTemporal).toBe("TempPass2026");
    expect(usuario.passwordHash).toBe("hash-de-TempPass2026");
  });

  it("incrementa token_version: cierra las demás sesiones (regla 5)", async () => {
    const { useCase } = construir();

    const { usuario } = await useCase.ejecutar("admin-1", "usuario-1");

    expect(usuario.tokenVersion).toBe(4);
  });

  it("no toca email_verificado_en: nadie demostró controlar el correo, fue el Admin quien actuó", async () => {
    const { repo, useCase } = construir();
    repo.usuarios[1].emailVerificadoEn = null;

    const { usuario } = await useCase.ejecutar("admin-1", "usuario-1");

    expect(usuario.emailVerificadoEn).toBeNull();
  });

  it("una contraseña que no cumple la política se rechaza", async () => {
    const { repo, useCase } = construir();

    await expect(useCase.ejecutar("admin-1", "usuario-1", "corta")).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repo.usuarios[1].tokenVersion).toBe(3);
  });

  it("una cuenta que no existe da 404", async () => {
    const { useCase } = construir();

    await expect(useCase.ejecutar("admin-1", "no-existe")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("registra el evento sin la contraseña", async () => {
    const { useCase, logger } = construir();

    await useCase.ejecutar("admin-1", "usuario-1", "ClaveNueva2026");

    expect(logger.registros).toEqual([
      { nivel: "info", evento: "password_restablecida_por_admin", datos: { usuarioId: "usuario-1", adminId: "admin-1" } },
    ]);
    expect(JSON.stringify(logger.registros)).not.toContain("ClaveNueva2026");
  });
});
