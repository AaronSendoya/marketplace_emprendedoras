import { decodeJwt, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorNoAutenticado } from "@/shared/domain/errors";
import { JwtTokenService } from "./JwtTokenService";

const SECRETO = "clave-de-pruebas-con-al-menos-32-caracteres-123";
const servicio = new JwtTokenService(SECRETO);

describe("JwtTokenService", () => {
  it("el token de Emprendedor no lleva exp (sesión permanente, regla 5)", async () => {
    const token = await servicio.emitir({ id: "u1", tokenVersion: 0, rol: "Emprendedor", sesionId: "sesion-u1" });

    const payload = decodeJwt(token);

    expect(payload.exp).toBeUndefined();
    expect(payload.sub).toBe("u1");
    expect(payload.tv).toBe(0);
  });

  it("el token de Admin expira a las 4 horas de emitirse (regla 5)", async () => {
    const token = await servicio.emitir({ id: "u2", tokenVersion: 1, rol: "Admin", sesionId: "sesion-u2" });

    const payload = decodeJwt(token);

    expect(payload.exp).toBeDefined();
    expect(payload.exp! - payload.iat!).toBe(4 * 60 * 60);
  });

  describe("con el reloj adelantado", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("el token de Admin vale hasta las 4 horas y deja de valer después, aunque la firma sea correcta", async () => {
      const token = await servicio.emitir({ id: "u7", tokenVersion: 0, rol: "Admin", sesionId: "sesion-u7" });
      const emitidoEn = Date.now();
      vi.useFakeTimers({ toFake: ["Date"] });

      vi.setSystemTime(emitidoEn + (4 * 60 * 60 - 60) * 1000);
      await expect(servicio.verificar(token)).resolves.toEqual({ sub: "u7", tv: 0, jti: "sesion-u7" });

      vi.setSystemTime(emitidoEn + (4 * 60 * 60 + 60) * 1000);
      await expect(servicio.verificar(token)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    });

    it("el token de Emprendedor sigue valiendo un año después (sesión permanente)", async () => {
      const token = await servicio.emitir({ id: "u8", tokenVersion: 2, rol: "Emprendedor", sesionId: "sesion-u8" });
      vi.useFakeTimers({ toFake: ["Date"] });

      vi.setSystemTime(Date.now() + 365 * 24 * 60 * 60 * 1000);

      await expect(servicio.verificar(token)).resolves.toEqual({ sub: "u8", tv: 2, jti: "sesion-u8" });
    });
  });

  it("el token nunca lleva el rol (regla 5: el rol se lee de la base)", async () => {
    const token = await servicio.emitir({ id: "u3", tokenVersion: 0, rol: "Admin", sesionId: "sesion-u3" });

    expect(decodeJwt(token)).not.toHaveProperty("rol");
  });

  it("verifica un token propio y devuelve sub y tv", async () => {
    const token = await servicio.emitir({ id: "u4", tokenVersion: 5, rol: "Emprendedor", sesionId: "sesion-u4" });

    await expect(servicio.verificar(token)).resolves.toEqual({ sub: "u4", tv: 5, jti: "sesion-u4" });
  });

  it("el token lleva el id de su sesión como jti (regla 5)", async () => {
    const token = await servicio.emitir({ id: "u9", tokenVersion: 0, rol: "Emprendedor", sesionId: "11111111-1111-4111-8111-111111111111" });

    expect(decodeJwt(token).jti).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("dos inicios de sesión de la misma cuenta, aunque sean en el mismo segundo, nunca dan el mismo token", async () => {
    const cuenta = { id: "u10", tokenVersion: 0, rol: "Admin" as const };
    const primero = await servicio.emitir({ ...cuenta, sesionId: "sesion-a" });
    const segundo = await servicio.emitir({ ...cuenta, sesionId: "sesion-b" });

    expect(primero).not.toBe(segundo);
    await expect(servicio.verificar(primero)).resolves.toMatchObject({ jti: "sesion-a" });
    await expect(servicio.verificar(segundo)).resolves.toMatchObject({ jti: "sesion-b" });
  });

  it("rechaza un token bien firmado que no lleva sesión (jti), p. ej. uno emitido antes de las sesiones del servidor", async () => {
    const secreto = new TextEncoder().encode(SECRETO);
    const sinSesion = await new SignJWT({ tv: 0 }).setProtectedHeader({ alg: "HS256" }).setSubject("u11").setIssuedAt().sign(secreto);
    const sesionVacia = await new SignJWT({ tv: 0 }).setProtectedHeader({ alg: "HS256" }).setSubject("u11").setJti("").setIssuedAt().sign(secreto);

    await expect(servicio.verificar(sinSesion)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    await expect(servicio.verificar(sesionVacia)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza un token firmado con otra clave", async () => {
    const otroServicio = new JwtTokenService("otra-clave-tambien-de-32-caracteres!");
    const token = await otroServicio.emitir({ id: "u5", tokenVersion: 0, rol: "Emprendedor", sesionId: "sesion-u5" });

    await expect(servicio.verificar(token)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza un token vencido", async () => {
    const secreto = new TextEncoder().encode(SECRETO);
    const ahoraEnSegundos = Math.floor(Date.now() / 1000);
    const vencido = await new SignJWT({ tv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u6")
      .setJti("sesion-u6")
      .setIssuedAt(ahoraEnSegundos - 100)
      .setExpirationTime(ahoraEnSegundos - 10)
      .sign(secreto);

    await expect(servicio.verificar(vencido)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza un texto que no es un JWT", async () => {
    await expect(servicio.verificar("esto-no-es-un-token")).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza un token sin `tv`", async () => {
    const secreto = new TextEncoder().encode(SECRETO);
    const sinTv = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u7").setIssuedAt().sign(secreto);

    await expect(servicio.verificar(sinTv)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });
});
