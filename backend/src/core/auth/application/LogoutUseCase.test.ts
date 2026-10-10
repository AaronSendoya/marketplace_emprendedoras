import { describe, expect, it } from "vitest";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { ErrorNoAutenticado } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import { JwtTokenService } from "../infrastructure/JwtTokenService";
import { LoggerFalso, usuarioDePrueba } from "../testing/dobles";
import { emitirConSesion, SesionRepositoryEnMemoria } from "../testing/SesionRepositoryEnMemoria";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { LogoutUseCase } from "./LogoutUseCase";

const AHORA = new Date("2026-10-08T12:00:00Z");

function construir() {
  const usuarios = new UsuarioRepositoryEnMemoria([usuarioDePrueba({ id: "usuario-1", tokenVersion: 0 }), usuarioDePrueba({ id: "usuario-2", email: "otra@gmail.com", tokenVersion: 0 })]);
  const sesiones = new SesionRepositoryEnMemoria();
  const tokens = new JwtTokenService("secreto-de-prueba-de-al-menos-32-caracteres");
  const logger = new LoggerFalso();
  const protegida = requireAuth(() => new Response("ok"), { usuarios, sesiones, tokens, clock: new FakeClock(AHORA) });
  const peticion = (token: string) => new Request("http://localhost/x", { headers: { authorization: `Bearer ${token}` } });
  return { sesiones, tokens, logger, protegida, peticion, useCase: new LogoutUseCase(sesiones, logger) };
}

describe("LogoutUseCase", () => {
  it("el token deja de valer en el servidor apenas se cierra la sesión, aunque alguien lo hubiera copiado (regla 5)", async () => {
    const { sesiones, tokens, protegida, peticion, useCase } = construir();
    const token = await emitirConSesion(tokens, sesiones, { id: "usuario-1", tokenVersion: 0, rol: "Emprendedor" }, AHORA);
    const copiaDelToken = token;
    expect((await protegida(peticion(token), undefined)).status).toBe(200);

    await useCase.ejecutar("usuario-1", sesiones.sesiones[0].id);

    await expect(protegida(peticion(copiaDelToken), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    expect(sesiones.sesiones).toHaveLength(0);
  });

  it("solo cierra la sesión de ese token: las de la misma cuenta en otros dispositivos siguen abiertas", async () => {
    const { sesiones, tokens, protegida, peticion, useCase } = construir();
    const cuenta = { id: "usuario-1", tokenVersion: 0, rol: "Emprendedor" as const };
    const telefono = await emitirConSesion(tokens, sesiones, cuenta, AHORA);
    const computador = await emitirConSesion(tokens, sesiones, cuenta, AHORA);
    expect(telefono).not.toBe(computador);

    await useCase.ejecutar("usuario-1", sesiones.sesiones[0].id);

    await expect(protegida(peticion(telefono), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    expect((await protegida(peticion(computador), undefined)).status).toBe(200);
  });

  it("no puede cerrar la sesión de otra cuenta aunque conozca su id", async () => {
    const { sesiones, tokens, protegida, peticion, useCase } = construir();
    const tokenDeLaOtra = await emitirConSesion(tokens, sesiones, { id: "usuario-2", tokenVersion: 0, rol: "Emprendedor" }, AHORA);

    await useCase.ejecutar("usuario-1", sesiones.sesiones[0].id);

    expect((await protegida(peticion(tokenDeLaOtra), undefined)).status).toBe(200);
    expect(sesiones.sesiones).toHaveLength(1);
  });

  it("cerrar una sesión que ya no existe no falla (idempotente)", async () => {
    const { useCase } = construir();

    await expect(useCase.ejecutar("usuario-1", "sesion-que-no-existe")).resolves.toBeUndefined();
  });

  it("registra el evento solo con el id de la cuenta: ni el token ni el id de la sesión", async () => {
    const { sesiones, tokens, logger, useCase } = construir();
    const token = await emitirConSesion(tokens, sesiones, { id: "usuario-1", tokenVersion: 0, rol: "Emprendedor" }, AHORA);
    const sesionId = sesiones.sesiones[0].id;

    await useCase.ejecutar("usuario-1", sesionId);

    expect(logger.registros).toEqual([{ nivel: "info", evento: "logout", datos: { usuarioId: "usuario-1" } }]);
    const texto = JSON.stringify(logger.registros);
    expect(texto).not.toContain(token);
    expect(texto).not.toContain(sesionId);
  });
});
