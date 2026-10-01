import { describe, expect, it } from "vitest";
import type { CambiarEmailUseCase } from "@/core/auth/application/CambiarEmailUseCase";
import type { LoginUseCase } from "@/core/auth/application/LoginUseCase";
import type { RequestOtpUseCase } from "@/core/auth/application/RequestOtpUseCase";
import type { ResetPasswordUseCase } from "@/core/auth/application/ResetPasswordUseCase";
import type { Usuario, UsuarioAutenticado } from "@/core/auth/domain/Usuario";
import {
  cambiarEmail,
  login,
  obtenerMe,
  restablecerPassword,
  solicitarCodigoEmail,
  solicitarCodigoPassword,
} from "./auth.controller";

const usuario: Usuario = {
  id: "u1",
  email: "admin@gmail.com",
  nombres: "Administrador",
  apellidoPaterno: "General",
  apellidoMaterno: null,
  passwordHash: "hash-secreto",
  rol: "Admin",
  activo: true,
  emailVerificadoEn: new Date("2026-01-01T00:00:00Z"),
  tokenVersion: 0,
  creadoEn: new Date("2025-12-31T00:00:00Z"),
};

describe("login", () => {
  it("responde el token y el usuario serializado en snake_case, sin el hash", async () => {
    const usecase = { ejecutar: async () => ({ token: "jwt-de-prueba", usuario }) } as unknown as LoginUseCase;

    const cuerpo = await login(usecase, "admin@gmail.com", "clave").then((r) => r.json());

    expect(cuerpo).toEqual({
      token: "jwt-de-prueba",
      usuario: {
        id: "u1",
        email: "admin@gmail.com",
        nombres: "Administrador",
        apellido_paterno: "General",
        apellido_materno: null,
        nombre_completo: "Administrador General",
        rol: "Admin",
        activo: true,
        email_verificado_en: "2026-01-01T00:00:00.000Z",
        creado_en: "2025-12-31T00:00:00.000Z",
      },
    });
    expect(JSON.stringify(cuerpo)).not.toContain("hash-secreto");
  });

  it("pasa el correo y la contraseña tal cual al caso de uso", async () => {
    let recibido: [string, string] | undefined;
    const usecase = {
      ejecutar: async (email: string, password: string) => {
        recibido = [email, password];
        return { token: "x", usuario };
      },
    } as unknown as LoginUseCase;

    await login(usecase, "admin@gmail.com", "Aaron123*");

    expect(recibido).toEqual(["admin@gmail.com", "Aaron123*"]);
  });
});

describe("controladores de OTP", () => {
  it("solicitarCodigoPassword pide un código de restablecimiento y responde el mismo texto siempre", async () => {
    const pedidos: unknown[] = [];
    const usecase = { ejecutar: async (p: unknown) => void pedidos.push(p) } as unknown as RequestOtpUseCase;

    const respuesta = await solicitarCodigoPassword(usecase, "nadie@gmail.com");

    expect(pedidos).toEqual([{ email: "nadie@gmail.com", proposito: "restablecer_password" }]);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ mensaje: "Si el correo tiene una cuenta activa, recibirás un código." });
  });

  it("solicitarCodigoEmail pide un código de verificación para el correo nuevo", async () => {
    const pedidos: unknown[] = [];
    const usecase = { ejecutar: async (p: unknown) => void pedidos.push(p) } as unknown as RequestOtpUseCase;

    await solicitarCodigoEmail(usecase, "nuevo@gmail.com");

    expect(pedidos).toEqual([{ email: "nuevo@gmail.com", proposito: "verificar_email" }]);
  });

  it("restablecerPassword pasa los datos al caso de uso y no devuelve datos de la cuenta", async () => {
    let recibido: unknown;
    const usecase = { ejecutar: async (d: unknown) => void (recibido = d) } as unknown as ResetPasswordUseCase;

    const cuerpo = await restablecerPassword(usecase, { email: "a@b.com", codigo: "123456", passwordNueva: "ClaveNueva2026" }).then((r) => r.json());

    expect(recibido).toEqual({ email: "a@b.com", codigo: "123456", passwordNueva: "ClaveNueva2026" });
    expect(Object.keys(cuerpo)).toEqual(["mensaje"]);
  });

  it("cambiarEmail responde el usuario serializado, sin el hash", async () => {
    const usecase = { ejecutar: async () => ({ ...usuario, email: "nuevo@gmail.com" }) } as unknown as CambiarEmailUseCase;

    const cuerpo = await cambiarEmail(usecase, "u1", "nuevo@gmail.com", "123456").then((r) => r.json());

    expect(cuerpo).toMatchObject({ id: "u1", email: "nuevo@gmail.com", nombre_completo: "Administrador General" });
    expect(JSON.stringify(cuerpo)).not.toContain("hash-secreto");
  });
});

describe("obtenerMe", () => {
  it("serializa al usuario autenticado igual que login, sin exigir el hash de la contraseña", async () => {
    const usuarioAutenticado: UsuarioAutenticado = { ...usuario, emailVerificadoEn: null };

    const cuerpo = await obtenerMe(usuarioAutenticado).json();

    expect(cuerpo).toMatchObject({ id: "u1", rol: "Admin", email_verificado_en: null });
  });
});
