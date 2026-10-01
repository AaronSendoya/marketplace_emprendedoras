import { describe, expect, it } from "vitest";
import { ErrorConflicto, ErrorValidacion } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import { CorreoFalso, hasherFalso, LoggerFalso, usuarioDePrueba } from "../testing/dobles";
import { OtpRepositoryEnMemoria } from "../testing/OtpRepositoryEnMemoria";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { CambiarEmailUseCase } from "./CambiarEmailUseCase";
import { RequestOtpUseCase } from "./RequestOtpUseCase";
import { VerificadorOtp } from "./VerificadorOtp";

const AHORA = new Date("2026-09-23T12:00:00Z");

function construir() {
  const repoUsuarios = new UsuarioRepositoryEnMemoria([
    usuarioDePrueba(),
    usuarioDePrueba({ id: "usuario-2", email: "ocupado@gmail.com" }),
  ]);
  const otps = new OtpRepositoryEnMemoria();
  const clock = new FakeClock(AHORA);
  const logger = new LoggerFalso();
  const solicitar = new RequestOtpUseCase(otps, repoUsuarios, hasherFalso, new CorreoFalso(), clock, logger, () => "482913");
  const cambiar = new CambiarEmailUseCase(new VerificadorOtp(otps, hasherFalso, clock), repoUsuarios, clock, logger);
  return { repoUsuarios, solicitar, cambiar, logger };
}

const pedirCodigo = (solicitar: RequestOtpUseCase, email: string) => solicitar.ejecutar({ email, proposito: "verificar_email" });

describe("CambiarEmailUseCase", () => {
  it("con el código enviado al correo nuevo, cambia el correo, lo deja verificado y devuelve la cuenta", async () => {
    const { repoUsuarios, solicitar, cambiar } = construir();
    await pedirCodigo(solicitar, "nuevo@gmail.com");

    const usuario = await cambiar.ejecutar("usuario-1", "nuevo@gmail.com", "482913");

    expect(usuario).toMatchObject({ id: "usuario-1", email: "nuevo@gmail.com", emailVerificadoEn: AHORA });
    expect(repoUsuarios.usuarios[0].tokenVersion).toBe(3); // no cierra sesiones
  });

  it("un código incorrecto no cambia el correo", async () => {
    const { repoUsuarios, solicitar, cambiar } = construir();
    await pedirCodigo(solicitar, "nuevo@gmail.com");

    await expect(cambiar.ejecutar("usuario-1", "nuevo@gmail.com", "000000")).rejects.toBeInstanceOf(ErrorValidacion);

    expect(repoUsuarios.usuarios[0].email).toBe("aaron@gmail.com");
  });

  it("el código enviado a un correo no sirve para confirmar otro", async () => {
    const { solicitar, cambiar } = construir();
    await pedirCodigo(solicitar, "nuevo@gmail.com");

    await expect(cambiar.ejecutar("usuario-1", "otro@gmail.com", "482913")).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("si otra cuenta ya usa el correo, da conflicto", async () => {
    const { solicitar, cambiar } = construir();
    await pedirCodigo(solicitar, "ocupado@gmail.com");

    await expect(cambiar.ejecutar("usuario-1", "ocupado@gmail.com", "482913")).rejects.toBeInstanceOf(ErrorConflicto);
  });

  it("registra el evento sin el correo ni el código", async () => {
    const { solicitar, cambiar, logger } = construir();
    await pedirCodigo(solicitar, "nuevo@gmail.com");

    await cambiar.ejecutar("usuario-1", "nuevo@gmail.com", "482913");

    expect(logger.registros.at(-1)).toEqual({ nivel: "info", evento: "email_cambiado", datos: { usuarioId: "usuario-1" } });
    expect(JSON.stringify(logger.registros)).not.toMatch(/482913|@gmail\.com/);
  });
});
