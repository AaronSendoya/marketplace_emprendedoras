import { describe, expect, it } from "vitest";
import { LoggerFalso } from "@/core/auth/testing/dobles";
import { ErrorConflicto, ErrorValidacion } from "@/shared/domain/errors";
import type { IGoogleOAuth } from "../domain/IGoogleOAuth";
import { DriveFalso } from "../testing/DriveFalso";
import { ConectarGoogleUseCase, EstadoDeGoogleUseCase, UrlDeAutorizacionDeGoogleUseCase } from "./ConexionGoogle";

const oauth = (disponible: boolean, parches: Partial<IGoogleOAuth> = {}): IGoogleOAuth => ({
  disponible: () => disponible,
  urlDeAutorizacion: (state, desafio) => `https://google.test/auth?state=${state}&code_challenge=${desafio}`,
  intercambiar: async () => ({ accessToken: "ya29.token-de-prueba-valido-0000000000", expiraEnSegundos: 3600 }),
  ...parches,
});

describe("EstadoDeGoogleUseCase", () => {
  it("dice si el servidor tiene configurada la conexión con Google", () => {
    expect(new EstadoDeGoogleUseCase(oauth(true)).ejecutar()).toEqual({ disponible: true });
    expect(new EstadoDeGoogleUseCase(oauth(false)).ejecutar()).toEqual({ disponible: false });
  });
});

describe("UrlDeAutorizacionDeGoogleUseCase", () => {
  it("arma la dirección con el state y el desafío que dio el frontend", () => {
    const { url } = new UrlDeAutorizacionDeGoogleUseCase(oauth(true)).ejecutar("estado-0123456789abcdef", "desafio");

    expect(url).toContain("state=estado-0123456789abcdef");
    expect(url).toContain("code_challenge=desafio");
  });

  it("sin Google configurado responde conflicto, con el campo `google`", () => {
    const intento = () => new UrlDeAutorizacionDeGoogleUseCase(oauth(false)).ejecutar("e", "d");

    expect(intento).toThrow(ErrorConflicto);
    try {
      intento();
    } catch (error) {
      expect((error as ErrorConflicto).detalles?.[0].campo).toBe("google");
    }
  });
});

describe("ConectarGoogleUseCase", () => {
  it("cambia el código por el token y devuelve también el correo de la cuenta conectada", async () => {
    const drive = new DriveFalso();
    drive.correo = "empresa@gmail.com";
    const usecase = new ConectarGoogleUseCase(oauth(true, { intercambiar: async () => ({ accessToken: drive.tokenValido, expiraEnSegundos: 3000 }) }), drive, new LoggerFalso());

    const conexion = await usecase.ejecutar("admin-1", "4/0codigo", "verificador");

    expect(conexion).toEqual({ accessToken: drive.tokenValido, expiraEnSegundos: 3000, cuenta: "empresa@gmail.com" });
  });

  it("le pasa a Google el código y el verificador PKCE tal cual", async () => {
    let recibido: unknown[] = [];
    const drive = new DriveFalso();
    const usecase = new ConectarGoogleUseCase(
      oauth(true, {
        intercambiar: async (...args) => {
          recibido = args;
          return { accessToken: drive.tokenValido, expiraEnSegundos: 3600 };
        },
      }),
      drive,
      new LoggerFalso(),
    );

    await usecase.ejecutar("admin-1", "4/0codigo", "verificador-pkce");

    expect(recibido).toEqual(["4/0codigo", "verificador-pkce"]);
  });

  it("no guarda ni registra el token ni el correo: solo quién conectó", async () => {
    const drive = new DriveFalso();
    const logger = new LoggerFalso();
    await new ConectarGoogleUseCase(oauth(true, { intercambiar: async () => ({ accessToken: drive.tokenValido, expiraEnSegundos: 3600 }) }), drive, logger).ejecutar(
      "admin-1",
      "c",
      "v",
    );

    expect(logger.registros).toEqual([{ nivel: "info", evento: "google_conectado", datos: { adminId: "admin-1" } }]);
    expect(JSON.stringify(logger.registros)).not.toContain(drive.tokenValido);
    expect(JSON.stringify(logger.registros)).not.toContain("empresa@gmail.com");
  });

  it("si Drive no informa el correo, conecta igual (sin mostrar la cuenta)", async () => {
    const drive = new DriveFalso();
    drive.correo = null;
    const usecase = new ConectarGoogleUseCase(oauth(true, { intercambiar: async () => ({ accessToken: drive.tokenValido, expiraEnSegundos: 3600 }) }), drive, new LoggerFalso());

    expect((await usecase.ejecutar("admin-1", "c", "v")).cuenta).toBeNull();
  });

  it("un token recién emitido que Drive rechaza no cuenta como conexión", async () => {
    const usecase = new ConectarGoogleUseCase(oauth(true, { intercambiar: async () => ({ accessToken: "ya29.no-lo-acepta-drive-00000000000", expiraEnSegundos: 3600 }) }), new DriveFalso(), new LoggerFalso());

    await expect(usecase.ejecutar("admin-1", "c", "v")).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("si Google rechaza el código, el error de Google sube tal cual (ya es un mensaje propio, sin datos de la cuenta)", async () => {
    const usecase = new ConectarGoogleUseCase(
      oauth(true, {
        intercambiar: async () => {
          throw new ErrorValidacion("No pudimos conectar con Google. Vuelve a pulsar «Conectar cuenta de Google» e inténtalo de nuevo.");
        },
      }),
      new DriveFalso(),
      new LoggerFalso(),
    );

    await expect(usecase.ejecutar("admin-1", "c", "v")).rejects.toThrow(/Conectar cuenta de Google/);
  });

  it("sin Google configurado no intenta nada", async () => {
    let llamado = false;
    const usecase = new ConectarGoogleUseCase(
      oauth(false, {
        intercambiar: async () => {
          llamado = true;
          throw new Error("no debía llamarse");
        },
      }),
      new DriveFalso(),
      new LoggerFalso(),
    );

    await expect(usecase.ejecutar("admin-1", "c", "v")).rejects.toBeInstanceOf(ErrorConflicto);
    expect(llamado).toBe(false);
  });
});
