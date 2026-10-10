import { describe, expect, it } from "vitest";
import { ErrorDemasiadasSolicitudes, ErrorNoAutenticado } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import type { EstadoIntentosLogin, IIntentosLoginRepository } from "../domain/IIntentosLoginRepository";
import type { IPasswordHasher } from "../domain/IPasswordHasher";
import type { ITokenService } from "../domain/ITokenService";
import type { Usuario } from "../domain/Usuario";
import { LoggerFalso } from "../testing/dobles";
import { SesionRepositoryEnMemoria } from "../testing/SesionRepositoryEnMemoria";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { ESPERAS_SEGUNDOS, LoginUseCase, TAMANO_TANDA_INTENTOS } from "./LoginUseCase";

const AHORA = new Date("2026-09-22T12:00:00Z");
const CLAVE_CORRECTA = "clave-correcta";

const usuario = (parches: Partial<Usuario> = {}): Usuario => ({
  id: "usuario-1",
  email: "aaron@gmail.com",
  nombres: "Aaron",
  apellidoPaterno: "Mamani",
  apellidoMaterno: null,
  passwordHash: "hash-correcto",
  rol: "Emprendedor",
  activo: true,
  emailVerificadoEn: null,
  tokenVersion: 3,
  creadoEn: AHORA,
  ...parches,
});

// Compara por igualdad de texto: prueba la lógica del caso de uso, no bcrypt (lo prueba
// BcryptPasswordHasher.test.ts).
const hasherFalso: IPasswordHasher = {
  hash: async (p) => `hash-de-${p}`,
  comparar: async (plano, hash) => hash === "hash-correcto" && plano === CLAVE_CORRECTA,
};

class TokensFalsos implements ITokenService {
  emitidos: { id: string; tokenVersion: number; rol: string; sesionId: string }[] = [];
  async emitir(datos: { id: string; tokenVersion: number; rol: string; sesionId: string }) {
    this.emitidos.push(datos);
    return `token-de-${datos.id}-${datos.sesionId}`;
  }
  verificar(): Promise<never> {
    throw new Error("no se usa en estas pruebas");
  }
}

class IntentosLoginFalso implements IIntentosLoginRepository {
  filas: { email: string; creadoEn: Date }[] = [];
  async estado(email: string): Promise<EstadoIntentosLogin> {
    const propias = this.filas.filter((f) => f.email === email);
    return { totalFallos: propias.length, ultimoFallo: propias.at(-1)?.creadoEn ?? null };
  }
  async registrarFallo(email: string, ahora: Date) {
    this.filas.push({ email, creadoEn: ahora });
  }
  async limpiar(email: string) {
    this.filas = this.filas.filter((f) => f.email !== email);
  }
}

function construir(usuarios: Usuario[] = [usuario()], hasher: IPasswordHasher = hasherFalso) {
  const repo = new UsuarioRepositoryEnMemoria(usuarios);
  const tokens = new TokensFalsos();
  const intentos = new IntentosLoginFalso();
  const sesiones = new SesionRepositoryEnMemoria();
  const clock = new FakeClock(AHORA);
  const logger = new LoggerFalso();
  const useCase = new LoginUseCase(repo, hasher, tokens, intentos, sesiones, clock, logger);
  return { useCase, tokens, intentos, sesiones, clock, logger };
}

async function fallarNVeces(useCase: LoginUseCase, n: number) {
  for (let i = 0; i < n; i++) await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch(() => {});
}

describe("LoginUseCase", () => {
  it("con credenciales correctas emite un token y no registra un intento fallido", async () => {
    const { useCase, tokens, intentos } = construir();

    const resultado = await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);

    expect(resultado.token).toBe("token-de-usuario-1-sesion-1");
    expect(resultado.usuario.email).toBe("aaron@gmail.com");
    expect(tokens.emitidos).toEqual([{ id: "usuario-1", tokenVersion: 3, rol: "Emprendedor", sesionId: "sesion-1" }]);
    expect(intentos.filas).toHaveLength(0);
  });

  describe("sesiones del servidor (regla 5)", () => {
    it("cada inicio de sesión crea una sesión nueva y un token nuevo, aunque sea la misma cuenta", async () => {
      const { useCase, sesiones } = construir();

      const primero = await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);
      const segundo = await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);

      expect(primero.token).not.toBe(segundo.token);
      expect(sesiones.sesiones.map((s) => s.id)).toEqual(["sesion-1", "sesion-2"]);
      expect(sesiones.sesiones.every((s) => s.usuarioId === "usuario-1")).toBe(true);
    });

    it("el token se emite con el id de la sesión recién creada", async () => {
      const { useCase, tokens, sesiones } = construir();

      await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);

      expect(tokens.emitidos[0].sesionId).toBe(sesiones.sesiones[0].id);
    });

    it("la sesión de una Emprendedora no vence", async () => {
      const { useCase, sesiones } = construir();

      await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);

      expect(sesiones.sesiones[0]).toMatchObject({ usuarioId: "usuario-1", creadaEn: AHORA, expiraEn: null });
    });

    it("la sesión de un Admin vence a las 4 horas de iniciarla", async () => {
      const { useCase, sesiones } = construir([usuario({ id: "admin-1", rol: "Admin" })]);

      await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);

      expect(sesiones.sesiones[0].expiraEn).toEqual(new Date(AHORA.getTime() + 4 * 60 * 60 * 1000));
    });

    it("con credenciales incorrectas, cuenta inactiva o freno activo no se crea ninguna sesión", async () => {
      const incorrecta = construir();
      const inactiva = construir([usuario({ activo: false })]);
      const bloqueada = construir();
      await fallarNVeces(bloqueada.useCase, TAMANO_TANDA_INTENTOS);

      await incorrecta.useCase.ejecutar("aaron@gmail.com", "clave-mala").catch(() => {});
      await inactiva.useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA).catch(() => {});
      await bloqueada.useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA).catch(() => {});

      expect(incorrecta.sesiones.sesiones).toHaveLength(0);
      expect(inactiva.sesiones.sesiones).toHaveLength(0);
      expect(bloqueada.sesiones.sesiones).toHaveLength(0);
    });
  });

  it("da el mismo error para un correo inexistente y una contraseña incorrecta", async () => {
    const errorClaveMala = await construir([usuario()]).useCase.ejecutar("aaron@gmail.com", "clave-mala").catch((e: unknown) => e);
    const errorSinCuenta = await construir([]).useCase.ejecutar("nadie@gmail.com", "cualquiera").catch((e: unknown) => e);

    expect(errorClaveMala).toBeInstanceOf(ErrorNoAutenticado);
    expect(errorSinCuenta).toBeInstanceOf(ErrorNoAutenticado);
    expect((errorClaveMala as Error).message).toBe((errorSinCuenta as Error).message);
  });

  it("rechaza una cuenta inactiva con el mismo mensaje, aunque la contraseña sea correcta", async () => {
    const { useCase } = construir([usuario({ activo: false })]);

    const error = await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorNoAutenticado);
    expect((error as Error).message).toBe("El correo o la contraseña son incorrectos.");
  });

  it.each([
    ["correo inexistente", "nadie@gmail.com", "cualquiera", [] as Usuario[]],
    ["contraseña incorrecta", "aaron@gmail.com", "clave-mala", [usuario()]],
    ["cuenta inactiva", "aaron@gmail.com", CLAVE_CORRECTA, [usuario({ activo: false })]],
  ])("registra un intento fallido: %s", async (_caso, email, password, usuarios) => {
    const { intentos, useCase } = construir(usuarios);

    await useCase.ejecutar(email, password).catch(() => {});

    expect(intentos.filas).toEqual([{ email, creadoEn: AHORA }]);
  });

  it("un intento exitoso reinicia el conteo a cero (regla 17)", async () => {
    const { useCase, intentos } = construir();
    await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch(() => {});

    await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);

    expect(intentos.filas).toHaveLength(0);
  });

  describe("espera escalonada (regla 17)", () => {
    it(`al completar la ${TAMANO_TANDA_INTENTOS}.ª falla, el siguiente intento se rechaza sin comparar la contraseña`, async () => {
      let comparaciones = 0;
      const hasherQueCuenta: IPasswordHasher = {
        hash: hasherFalso.hash,
        comparar: async (plano, hash) => {
          comparaciones++;
          return hasherFalso.comparar(plano, hash);
        },
      };
      const { useCase } = construir([usuario()], hasherQueCuenta);
      await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS);
      comparaciones = 0;

      const error = await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorDemasiadasSolicitudes);
      expect((error as ErrorDemasiadasSolicitudes).reintentarEnSegundos).toBe(ESPERAS_SEGUNDOS[0]);
      expect(comparaciones).toBe(0);
    });

    it("no bloquea entre tandas: deja pasar los intentos hasta completar la próxima", async () => {
      const { useCase, clock } = construir();
      await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS);
      clock.avanzar((ESPERAS_SEGUNDOS[0] + 1) * 1000);
      await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch(() => {}); // 6.ª falla, no bloqueada

      const error = await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch((e: unknown) => e); // 7.ª, tampoco

      expect(error).toBeInstanceOf(ErrorNoAutenticado);
    });

    it("escala al segundo escalón (30 s) al completar la segunda tanda", async () => {
      const { useCase, clock } = construir();
      await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS);
      clock.avanzar((ESPERAS_SEGUNDOS[0] + 1) * 1000); // pasa el primer escalón
      await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS); // 6.ª a 10.ª falla

      const error = await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorDemasiadasSolicitudes);
      expect((error as ErrorDemasiadasSolicitudes).reintentarEnSegundos).toBe(ESPERAS_SEGUNDOS[1]);
    });

    it("no supera el tope de 10 minutos aunque la racha siga creciendo", async () => {
      const { useCase, clock } = construir();
      for (const espera of ESPERAS_SEGUNDOS) {
        await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS);
        clock.avanzar((espera + 1) * 1000);
      }
      // Una tanda más, ya en el último escalón.
      await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS);

      const error = await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorDemasiadasSolicitudes);
      expect((error as ErrorDemasiadasSolicitudes).reintentarEnSegundos).toBe(ESPERAS_SEGUNDOS.at(-1));
    });

    it("pasado el escalón activo (reloj avanzado), vuelve a permitir el intento", async () => {
      const { useCase, clock } = construir();
      await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS);

      clock.avanzar((ESPERAS_SEGUNDOS[0] + 1) * 1000);

      await expect(useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA)).resolves.toMatchObject({ token: expect.any(String) });
    });

    it("un intento exitoso reinicia la escalada: la próxima racha vuelve a empezar en 15 s", async () => {
      const { useCase, clock } = construir();
      await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS);
      clock.avanzar((ESPERAS_SEGUNDOS[0] + 1) * 1000);
      await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);

      await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS);
      const error = await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorDemasiadasSolicitudes);
      expect((error as ErrorDemasiadasSolicitudes).reintentarEnSegundos).toBe(ESPERAS_SEGUNDOS[0]);
    });
  });

  describe("auditoría (regla 17)", () => {
    it("un inicio de sesión exitoso registra login_exitoso con el id de la cuenta", async () => {
      const { useCase, logger } = construir();

      await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);

      expect(logger.registros).toEqual([{ nivel: "info", evento: "login_exitoso", datos: { usuarioId: "usuario-1" } }]);
    });

    it.each([
      ["contraseña incorrecta", "aaron@gmail.com", "clave-mala", [usuario()], { usuarioId: "usuario-1" }],
      ["correo inexistente", "nadie@gmail.com", "cualquiera", [] as Usuario[], undefined],
    ])("un fallo (%s) registra login_fallido", async (_caso, email, password, usuarios, datos) => {
      const { useCase, logger } = construir(usuarios);

      await useCase.ejecutar(email, password).catch(() => {});

      expect(logger.registros).toEqual([{ nivel: "warn", evento: "login_fallido", datos }]);
    });

    it("el bloqueo por demasiados intentos registra login_bloqueado", async () => {
      const { useCase, logger } = construir();
      await fallarNVeces(useCase, TAMANO_TANDA_INTENTOS);

      await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch(() => {});

      expect(logger.registros.at(-1)).toMatchObject({ nivel: "warn", evento: "login_bloqueado" });
    });

    it("ningún registro lleva el correo ni la contraseña", async () => {
      const { useCase, logger } = construir();
      await useCase.ejecutar("aaron@gmail.com", "clave-mala").catch(() => {});
      await useCase.ejecutar("aaron@gmail.com", CLAVE_CORRECTA);

      const texto = JSON.stringify(logger.registros);
      expect(texto).not.toContain("aaron@gmail.com");
      expect(texto).not.toContain(CLAVE_CORRECTA);
      expect(texto).not.toContain("clave-mala");
    });
  });
});
