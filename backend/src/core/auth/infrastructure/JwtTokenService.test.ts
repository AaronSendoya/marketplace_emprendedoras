import { decodeJwt, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { ErrorNoAutenticado } from "@/shared/domain/errors";
import { JwtTokenService } from "./JwtTokenService";

const SECRETO = "clave-de-pruebas-con-al-menos-32-caracteres-123";
const servicio = new JwtTokenService(SECRETO);

describe("JwtTokenService", () => {
  it("el token de Emprendedor no lleva exp (sesión permanente, regla 5)", async () => {
    const token = await servicio.emitir({ id: "u1", tokenVersion: 0, rol: "Emprendedor" });

    const payload = decodeJwt(token);

    expect(payload.exp).toBeUndefined();
    expect(payload.sub).toBe("u1");
    expect(payload.tv).toBe(0);
  });

  it("el token de Admin expira a las 24 horas", async () => {
    const token = await servicio.emitir({ id: "u2", tokenVersion: 1, rol: "Admin" });

    const payload = decodeJwt(token);

    expect(payload.exp).toBeDefined();
    expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60);
  });

  it("el token nunca lleva el rol (regla 5: el rol se lee de la base)", async () => {
    const token = await servicio.emitir({ id: "u3", tokenVersion: 0, rol: "Admin" });

    expect(decodeJwt(token)).not.toHaveProperty("rol");
  });

  it("verifica un token propio y devuelve sub y tv", async () => {
    const token = await servicio.emitir({ id: "u4", tokenVersion: 5, rol: "Emprendedor" });

    await expect(servicio.verificar(token)).resolves.toEqual({ sub: "u4", tv: 5 });
  });

  it("rechaza un token firmado con otra clave", async () => {
    const otroServicio = new JwtTokenService("otra-clave-tambien-de-32-caracteres!");
    const token = await otroServicio.emitir({ id: "u5", tokenVersion: 0, rol: "Emprendedor" });

    await expect(servicio.verificar(token)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza un token vencido", async () => {
    const secreto = new TextEncoder().encode(SECRETO);
    const ahoraEnSegundos = Math.floor(Date.now() / 1000);
    const vencido = await new SignJWT({ tv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u6")
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
