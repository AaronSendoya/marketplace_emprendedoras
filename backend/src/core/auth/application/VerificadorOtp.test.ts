import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import { MAX_INTENTOS_OTP, VIGENCIA_OTP_MINUTOS } from "../domain/Otp";
import { hasherFalso } from "../testing/dobles";
import { OtpRepositoryEnMemoria } from "../testing/OtpRepositoryEnMemoria";
import { VerificadorOtp } from "./VerificadorOtp";

const INICIO = new Date("2026-09-23T12:00:00Z");
const EMAIL = "aaron@gmail.com";

async function construir() {
  const otps = new OtpRepositoryEnMemoria();
  const clock = new FakeClock(INICIO);
  const verificador = new VerificadorOtp(otps, hasherFalso, clock);
  const emitir = (codigo: string, proposito: "verificar_email" | "restablecer_password" = "restablecer_password", email = EMAIL) =>
    otps.crear({
      email,
      proposito,
      codigoHash: `hash-de-${codigo}`,
      expiraEn: new Date(clock.ahora().getTime() + VIGENCIA_OTP_MINUTOS * 60_000),
      creadoEn: clock.ahora(),
    });
  await emitir("123456");
  return { verificador, otps, clock, emitir };
}

const fallo = async (promesa: Promise<unknown>) => (await promesa.catch((e: unknown) => e)) as ErrorValidacion;

describe("VerificadorOtp", () => {
  it("con el código correcto lo consume", async () => {
    const { verificador, otps } = await construir();

    await verificador.consumir(EMAIL, "restablecer_password", "123456");

    expect(otps.filas[0].usadoEn).toEqual(INICIO);
  });

  it("es de un solo uso", async () => {
    const { verificador } = await construir();
    await verificador.consumir(EMAIL, "restablecer_password", "123456");

    expect(await fallo(verificador.consumir(EMAIL, "restablecer_password", "123456"))).toBeInstanceOf(ErrorValidacion);
  });

  it("un código incorrecto falla y gasta un intento", async () => {
    const { verificador, otps } = await construir();

    expect(await fallo(verificador.consumir(EMAIL, "restablecer_password", "000000"))).toBeInstanceOf(ErrorValidacion);

    expect(otps.filas[0]).toMatchObject({ intentos: 1, usadoEn: null });
  });

  it(`admite ${MAX_INTENTOS_OTP} intentos en total (el correcto también cuenta)`, async () => {
    const { verificador } = await construir();
    for (let i = 0; i < MAX_INTENTOS_OTP - 1; i++) {
      await fallo(verificador.consumir(EMAIL, "restablecer_password", "000000"));
    }

    await expect(verificador.consumir(EMAIL, "restablecer_password", "123456")).resolves.toBeUndefined();
  });

  it("agotados los intentos, ni el código correcto sirve", async () => {
    const { verificador } = await construir();
    for (let i = 0; i < MAX_INTENTOS_OTP; i++) {
      await fallo(verificador.consumir(EMAIL, "restablecer_password", "000000"));
    }

    expect(await fallo(verificador.consumir(EMAIL, "restablecer_password", "123456"))).toBeInstanceOf(ErrorValidacion);
  });

  it("vence a los 10 minutos", async () => {
    const { verificador, clock } = await construir();
    clock.avanzar(VIGENCIA_OTP_MINUTOS * 60_000);

    expect(await fallo(verificador.consumir(EMAIL, "restablecer_password", "123456"))).toBeInstanceOf(ErrorValidacion);
  });

  it("un minuto antes de vencer todavía sirve", async () => {
    const { verificador, clock } = await construir();
    clock.avanzar((VIGENCIA_OTP_MINUTOS - 1) * 60_000);

    await expect(verificador.consumir(EMAIL, "restablecer_password", "123456")).resolves.toBeUndefined();
  });

  it("un código nuevo invalida el anterior", async () => {
    const { verificador, clock, emitir } = await construir();
    clock.avanzar(2 * 60_000);
    await emitir("654321");

    expect(await fallo(verificador.consumir(EMAIL, "restablecer_password", "123456"))).toBeInstanceOf(ErrorValidacion);
    await expect(verificador.consumir(EMAIL, "restablecer_password", "654321")).resolves.toBeUndefined();
  });

  it("un código de otro propósito o de otro correo no sirve", async () => {
    const { verificador } = await construir();

    expect(await fallo(verificador.consumir(EMAIL, "verificar_email", "123456"))).toBeInstanceOf(ErrorValidacion);
    expect(await fallo(verificador.consumir("otra@gmail.com", "restablecer_password", "123456"))).toBeInstanceOf(ErrorValidacion);
  });

  it("todo fallo da el mismo mensaje, sin pistas de la causa", async () => {
    const { verificador, clock } = await construir();
    const incorrecto = await fallo(verificador.consumir(EMAIL, "restablecer_password", "000000"));
    const sinCodigo = await fallo(verificador.consumir("otra@gmail.com", "restablecer_password", "123456"));
    clock.avanzar(VIGENCIA_OTP_MINUTOS * 60_000);
    const vencido = await fallo(verificador.consumir(EMAIL, "restablecer_password", "123456"));

    expect(new Set([incorrecto.message, sinCodigo.message, vencido.message]).size).toBe(1);
    expect(incorrecto.detalles).toEqual([{ campo: "codigo", mensaje: incorrecto.message }]);
  });
});
