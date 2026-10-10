import { describe, expect, it } from "vitest";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { ErrorNoAutenticado, ErrorValidacion } from "@/shared/domain/errors";
import { SystemClock } from "@/shared/infrastructure/SystemClock";
import { FakeClock } from "@/shared/testing/FakeClock";
import { JwtTokenService } from "../infrastructure/JwtTokenService";
import { CorreoFalso, hasherFalso, LoggerFalso, usuarioDePrueba } from "../testing/dobles";
import { OtpRepositoryEnMemoria } from "../testing/OtpRepositoryEnMemoria";
import { emitirConSesion, SesionRepositoryEnMemoria } from "../testing/SesionRepositoryEnMemoria";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { RequestOtpUseCase } from "./RequestOtpUseCase";
import { ResetPasswordUseCase } from "./ResetPasswordUseCase";
import { VerificadorOtp } from "./VerificadorOtp";

const AHORA = new Date("2026-09-23T12:00:00Z");
const NUEVA = "ClaveNueva2026";

function construir(usuarios = [usuarioDePrueba()]) {
  const repoUsuarios = new UsuarioRepositoryEnMemoria(usuarios);
  const otps = new OtpRepositoryEnMemoria();
  const correo = new CorreoFalso();
  const logger = new LoggerFalso();
  const clock = new FakeClock(AHORA);
  const solicitar = new RequestOtpUseCase(otps, repoUsuarios, hasherFalso, correo, clock, logger, () => "482913");
  const restablecer = new ResetPasswordUseCase(new VerificadorOtp(otps, hasherFalso, clock), repoUsuarios, hasherFalso, clock, logger);
  return { repoUsuarios, solicitar, restablecer, correo, logger };
}

const pedirCodigo = (solicitar: RequestOtpUseCase, email = "aaron@gmail.com") =>
  solicitar.ejecutar({ email, proposito: "restablecer_password" });

describe("ResetPasswordUseCase", () => {
  it("con el código correcto cambia la contraseña, sube token_version y verifica el correo", async () => {
    const { repoUsuarios, solicitar, restablecer, correo } = construir();
    await pedirCodigo(solicitar);

    await restablecer.ejecutar({ email: "aaron@gmail.com", codigo: correo.ultimoCodigo(), passwordNueva: NUEVA });

    expect(repoUsuarios.usuarios[0]).toMatchObject({ passwordHash: `hash-de-${NUEVA}`, tokenVersion: 4, emailVerificadoEn: AHORA });
  });

  it("no toca la fecha de verificación si el correo ya estaba verificado", async () => {
    const antes = new Date("2026-01-05T00:00:00Z");
    const { repoUsuarios, solicitar, restablecer } = construir([usuarioDePrueba({ emailVerificadoEn: antes })]);
    await pedirCodigo(solicitar);

    await restablecer.ejecutar({ email: "aaron@gmail.com", codigo: "482913", passwordNueva: NUEVA });

    expect(repoUsuarios.usuarios[0].emailVerificadoEn).toEqual(antes);
  });

  it("un código incorrecto no cambia nada", async () => {
    const { repoUsuarios, solicitar, restablecer } = construir();
    await pedirCodigo(solicitar);

    await expect(restablecer.ejecutar({ email: "aaron@gmail.com", codigo: "000000", passwordNueva: NUEVA })).rejects.toBeInstanceOf(ErrorValidacion);

    expect(repoUsuarios.usuarios[0]).toMatchObject({ passwordHash: "hash-de-ClaveVieja123", tokenVersion: 3 });
  });

  it("una contraseña que no cumple la política se rechaza sin gastar un intento del código", async () => {
    const { solicitar, restablecer } = construir();
    await pedirCodigo(solicitar);

    await expect(restablecer.ejecutar({ email: "aaron@gmail.com", codigo: "482913", passwordNueva: "corta" })).rejects.toBeInstanceOf(ErrorValidacion);

    await expect(restablecer.ejecutar({ email: "aaron@gmail.com", codigo: "482913", passwordNueva: NUEVA })).resolves.toBeUndefined();
  });

  it.each([
    ["sin cuenta", "nadie@gmail.com", [usuarioDePrueba()]],
    ["con la cuenta inactiva", "aaron@gmail.com", [usuarioDePrueba({ activo: false })]],
  ])("un correo %s da el mismo error que un código malo, aunque se acierte el código", async (_caso, email, usuarios) => {
    const { repoUsuarios, solicitar, restablecer } = construir(usuarios);
    await pedirCodigo(solicitar, email);

    const conCodigoBueno = await restablecer.ejecutar({ email, codigo: "482913", passwordNueva: NUEVA }).catch((e: unknown) => e);
    const conCodigoMalo = await restablecer.ejecutar({ email, codigo: "000000", passwordNueva: NUEVA }).catch((e: unknown) => e);

    expect(conCodigoBueno).toBeInstanceOf(ErrorValidacion);
    expect((conCodigoBueno as Error).message).toBe((conCodigoMalo as Error).message);
    expect(repoUsuarios.usuarios.every((u) => u.tokenVersion === 3)).toBe(true);
  });

  it("registra el evento sin la contraseña, el código ni el correo", async () => {
    const { solicitar, restablecer, logger } = construir();
    await pedirCodigo(solicitar);

    await restablecer.ejecutar({ email: "aaron@gmail.com", codigo: "482913", passwordNueva: NUEVA });

    expect(logger.registros.at(-1)).toEqual({ nivel: "info", evento: "password_restablecida", datos: { usuarioId: "usuario-1" } });
    const texto = JSON.stringify(logger.registros);
    for (const secreto of [NUEVA, "482913", "aaron@gmail.com"]) expect(texto).not.toContain(secreto);
  });

  it("el token emitido antes de restablecer deja de valer (token_version, regla 5)", async () => {
    const { repoUsuarios, solicitar, restablecer } = construir();
    const tokens = new JwtTokenService("secreto-de-prueba-de-al-menos-32-caracteres");
    const sesiones = new SesionRepositoryEnMemoria();
    const tokenAnterior = await emitirConSesion(tokens, sesiones, { id: "usuario-1", tokenVersion: 3, rol: "Emprendedor" });
    const protegida = requireAuth(() => new Response("ok"), { usuarios: repoUsuarios, sesiones, tokens, clock: new SystemClock() });
    const peticion = () => new Request("http://localhost/x", { headers: { authorization: `Bearer ${tokenAnterior}` } });
    expect((await protegida(peticion(), undefined)).status).toBe(200);

    await pedirCodigo(solicitar);
    await restablecer.ejecutar({ email: "aaron@gmail.com", codigo: "482913", passwordNueva: NUEVA });

    await expect(protegida(peticion(), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });
});
