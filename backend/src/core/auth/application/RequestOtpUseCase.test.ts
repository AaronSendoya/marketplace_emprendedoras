import { describe, expect, it } from "vitest";
import { ErrorDemasiadasSolicitudes } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import { VIGENCIA_OTP_MINUTOS } from "../domain/Otp";
import { OtpRepositoryEnMemoria } from "../testing/OtpRepositoryEnMemoria";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { CorreoFalso, hasherFalso, LoggerFalso, usuarioDePrueba } from "../testing/dobles";
import { RequestOtpUseCase } from "./RequestOtpUseCase";

const INICIO = new Date("2026-09-23T12:00:00Z");
const MIN = 60_000;

function construir(usuarios = [usuarioDePrueba()]) {
  const otps = new OtpRepositoryEnMemoria();
  const correo = new CorreoFalso();
  const logger = new LoggerFalso();
  const clock = new FakeClock(INICIO);
  let contador = 0;
  // Códigos distintos y predecibles: 000001, 000002...
  const generarCodigo = () => String(++contador).padStart(6, "0");
  const useCase = new RequestOtpUseCase(otps, new UsuarioRepositoryEnMemoria(usuarios), hasherFalso, correo, clock, logger, generarCodigo);
  return { useCase, otps, correo, logger, clock };
}

const restablecer = (email: string) => ({ email, proposito: "restablecer_password" as const });

describe("RequestOtpUseCase", () => {
  it("restablecer_password con cuenta activa: guarda solo el hash, vence a los 10 minutos y envía el código", async () => {
    const { useCase, otps, correo } = construir();

    await useCase.ejecutar(restablecer("aaron@gmail.com"));

    expect(otps.filas).toHaveLength(1);
    expect(otps.filas[0]).toMatchObject({ email: "aaron@gmail.com", proposito: "restablecer_password", codigoHash: "hash-de-000001", intentos: 0, usadoEn: null });
    expect(otps.filas[0].expiraEn).toEqual(new Date(INICIO.getTime() + VIGENCIA_OTP_MINUTOS * MIN));
    expect(correo.enviados).toHaveLength(1);
    expect(correo.enviados[0].para).toBe("aaron@gmail.com");
    expect(correo.ultimoCodigo()).toBe("000001");
  });

  it.each([
    ["correo sin cuenta", "nadie@gmail.com", [usuarioDePrueba()]],
    ["cuenta inactiva", "aaron@gmail.com", [usuarioDePrueba({ activo: false })]],
    // Regla 15: el Admin no se recupera por OTP (su contraseña se cambia con una consulta directa,
    // regla 14). Misma respuesta que un correo inexistente, para no delatar el rol tampoco.
    ["cuenta Admin", "aaron@gmail.com", [usuarioDePrueba({ rol: "Admin" })]],
  ])("restablecer_password con %s: registra la solicitud igual, pero no envía nada", async (_caso, email, usuarios) => {
    const { useCase, otps, correo } = construir(usuarios);

    await expect(useCase.ejecutar(restablecer(email))).resolves.toBeUndefined();

    expect(otps.filas).toHaveLength(1);
    expect(correo.enviados).toHaveLength(0);
  });

  it("verificar_email envía el código al correo indicado aunque no tenga cuenta", async () => {
    const { useCase, otps, correo } = construir();

    await useCase.ejecutar({ email: "nueva@gmail.com", proposito: "verificar_email" });

    expect(otps.filas[0].proposito).toBe("verificar_email");
    expect(correo.enviados[0].para).toBe("nueva@gmail.com");
  });

  it("verificar_email propaga el fallo del envío; restablecer_password lo registra sin romper la respuesta", async () => {
    const verificar = construir();
    verificar.correo.falla = true;
    await expect(verificar.useCase.ejecutar({ email: "nueva@gmail.com", proposito: "verificar_email" })).rejects.toThrow("smtp caído");

    const restablecerCaso = construir();
    restablecerCaso.correo.falla = true;
    await expect(restablecerCaso.useCase.ejecutar(restablecer("aaron@gmail.com"))).resolves.toBeUndefined();
    await new Promise((resolver) => setImmediate(resolver));
    expect(restablecerCaso.logger.registros.map((r) => r.evento)).toContain("otp_envio_fallido");
  });

  it("nunca registra el código ni el correo en el logger", async () => {
    const { useCase, logger } = construir();

    await useCase.ejecutar(restablecer("aaron@gmail.com"));

    const texto = JSON.stringify(logger.registros);
    expect(texto).not.toContain("000001");
    expect(texto).not.toContain("aaron@gmail.com");
    expect(logger.registros[0]).toMatchObject({ evento: "otp_solicitado", datos: { proposito: "restablecer_password" } });
  });

  describe("límites de solicitudes (regla 15)", () => {
    it("una segunda solicitud dentro del minuto da 429 con el tiempo que falta, y no guarda ni envía nada", async () => {
      const { useCase, otps, correo, clock } = construir();
      await useCase.ejecutar(restablecer("aaron@gmail.com"));
      clock.avanzar(20_000);

      const error = await useCase.ejecutar(restablecer("aaron@gmail.com")).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorDemasiadasSolicitudes);
      expect((error as ErrorDemasiadasSolicitudes).reintentarEnSegundos).toBe(40);
      expect(otps.filas).toHaveLength(1);
      expect(correo.enviados).toHaveLength(1);
    });

    it("pasado el minuto vuelve a permitir", async () => {
      const { useCase, otps, clock } = construir();
      await useCase.ejecutar(restablecer("aaron@gmail.com"));

      clock.avanzar(MIN);
      await useCase.ejecutar(restablecer("aaron@gmail.com"));

      expect(otps.filas).toHaveLength(2);
    });

    it("la sexta solicitud en una hora da 429 hasta que salga la más antigua", async () => {
      const { useCase, clock } = construir();
      for (let i = 0; i < 5; i++) {
        await useCase.ejecutar(restablecer("aaron@gmail.com"));
        clock.avanzar(2 * MIN); // solicitudes en 0, 2, 4, 6 y 8 minutos
      }
      // Ahora son las 10 minutos: la más antigua (minuto 0) sale de la ventana a los 60.

      const error = await useCase.ejecutar(restablecer("aaron@gmail.com")).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorDemasiadasSolicitudes);
      expect((error as ErrorDemasiadasSolicitudes).reintentarEnSegundos).toBe(50 * 60);

      clock.avanzar(50 * MIN);
      await expect(useCase.ejecutar(restablecer("aaron@gmail.com"))).resolves.toBeUndefined();
    });

    it("se aplican igual si la cuenta no existe (no delatan si el correo tiene cuenta)", async () => {
      const { useCase } = construir();
      await useCase.ejecutar(restablecer("nadie@gmail.com"));

      await expect(useCase.ejecutar(restablecer("nadie@gmail.com"))).rejects.toBeInstanceOf(ErrorDemasiadasSolicitudes);
    });

    it("cuentan por correo sin distinguir el propósito", async () => {
      const { useCase } = construir();
      await useCase.ejecutar({ email: "aaron@gmail.com", proposito: "verificar_email" });

      await expect(useCase.ejecutar(restablecer("aaron@gmail.com"))).rejects.toBeInstanceOf(ErrorDemasiadasSolicitudes);
    });

    it("no se mezclan entre correos distintos", async () => {
      const { useCase } = construir();
      await useCase.ejecutar(restablecer("aaron@gmail.com"));

      await expect(useCase.ejecutar(restablecer("otra@gmail.com"))).resolves.toBeUndefined();
    });
  });
});
