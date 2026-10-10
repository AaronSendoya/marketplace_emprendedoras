import { describe, expect, it } from "vitest";
import type { ITokenService } from "@/core/auth/domain/ITokenService";
import type { Usuario } from "@/core/auth/domain/Usuario";
import { SesionRepositoryEnMemoria } from "@/core/auth/testing/SesionRepositoryEnMemoria";
import { ErrorNoAutenticado } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import { requireAuth, type DependenciasAuth } from "./requireAuth";

const usuarioBase: Usuario = {
  id: "u1",
  email: "a@b.com",
  nombres: "Ana",
  apellidoPaterno: "Perez",
  apellidoMaterno: null,
  passwordHash: "hash-secreto",
  rol: "Emprendedor",
  activo: true,
  emailVerificadoEn: null,
  tokenVersion: 2,
  creadoEn: new Date("2026-01-01T00:00:00Z"),
};

const AHORA = new Date("2026-10-08T12:00:00Z");

// Por defecto la cuenta tiene una sesión abierta (`sesion-1`) y el token la lleva.
async function deps(usuario: Usuario | null, opciones: { tv?: number; sesionDelToken?: string; sesionAbierta?: boolean; expiraEn?: Date | null } = {}) {
  const sesiones = new SesionRepositoryEnMemoria();
  if (opciones.sesionAbierta !== false) await sesiones.crear(usuario?.id ?? "u1", AHORA, opciones.expiraEn ?? null);
  const dependencias: DependenciasAuth = {
    usuarios: { buscarPorId: async () => usuario },
    sesiones,
    tokens: {
      emitir: async () => "x",
      verificar: async () => ({ sub: usuario?.id ?? "?", tv: opciones.tv ?? usuario?.tokenVersion ?? 0, jti: opciones.sesionDelToken ?? "sesion-1" }),
    } as ITokenService,
    clock: new FakeClock(AHORA),
  };
  return { dependencias, sesiones };
}

const peticion = (authorization?: string) =>
  new Request("http://localhost/api/v1/x", { headers: authorization ? { authorization } : {} });

describe("requireAuth", () => {
  it("llama al manejador con el usuario, sin el hash de la contraseña", async () => {
    const { dependencias } = await deps(usuarioBase);
    const manejador = requireAuth((_req, _ctx, usuario) => Response.json(usuario), dependencias);

    const respuesta = await manejador(peticion("Bearer token-valido"), undefined);
    const cuerpo = await respuesta.json();

    expect(cuerpo.id).toBe("u1");
    expect(cuerpo).not.toHaveProperty("passwordHash");
  });

  it("le da al manejador la sesión del token (la necesita el cierre de sesión)", async () => {
    const { dependencias } = await deps(usuarioBase);
    const manejador = requireAuth((_req, _ctx, _usuario, sesion) => Response.json(sesion), dependencias);

    const respuesta = await manejador(peticion("Bearer token-valido"), undefined);

    expect(await respuesta.json()).toEqual({ id: "sesion-1" });
  });

  it("sin cabecera Authorization, rechaza sin llamar al manejador", async () => {
    const { dependencias } = await deps(usuarioBase);
    const manejador = requireAuth(() => {
      throw new Error("no debería llamarse");
    }, dependencias);

    await expect(manejador(peticion(), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it.each(["Token x", "Bearer", "Basic x"])("rechaza la cabecera Authorization: %s", async (valor) => {
    const { dependencias } = await deps(usuarioBase);
    const manejador = requireAuth(() => Response.json({}), dependencias);

    await expect(manejador(peticion(valor), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza si el usuario ya no existe", async () => {
    const { dependencias } = await deps(null);
    const manejador = requireAuth(() => Response.json({}), dependencias);

    await expect(manejador(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza una cuenta inactiva", async () => {
    const { dependencias } = await deps({ ...usuarioBase, activo: false });
    const manejador = requireAuth(() => Response.json({}), dependencias);

    await expect(manejador(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza si token_version no coincide con la de la base (p. ej. tras restablecer la contraseña)", async () => {
    const { dependencias } = await deps(usuarioBase, { tv: usuarioBase.tokenVersion - 1 });
    const manejador = requireAuth(() => Response.json({}), dependencias);

    await expect(manejador(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  describe("sesión del servidor (regla 5)", () => {
    it("rechaza un token cuya sesión ya no existe (cerró sesión) sin llamar al manejador", async () => {
      const { dependencias } = await deps(usuarioBase, { sesionAbierta: false });
      const manejador = requireAuth(() => {
        throw new Error("no debería llamarse");
      }, dependencias);

      await expect(manejador(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    });

    it("rechaza un token cuya sesión es de otra cuenta", async () => {
      const { dependencias, sesiones } = await deps(usuarioBase, { sesionAbierta: false });
      await sesiones.crear("otra-cuenta", AHORA, null);
      const manejador = requireAuth(() => Response.json({}), dependencias);

      await expect(manejador(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    });

    it("rechaza un token con un id de sesión que no existe", async () => {
      const { dependencias } = await deps(usuarioBase, { sesionDelToken: "sesion-inventada" });
      const manejador = requireAuth(() => Response.json({}), dependencias);

      await expect(manejador(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
    });

    it("rechaza una sesión vencida y acepta una que todavía no vence", async () => {
      const vencida = await deps(usuarioBase, { expiraEn: new Date(AHORA.getTime() - 1000) });
      const vigente = await deps(usuarioBase, { expiraEn: new Date(AHORA.getTime() + 1000) });

      await expect(requireAuth(() => Response.json({}), vencida.dependencias)(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
      expect((await requireAuth(() => Response.json({}), vigente.dependencias)(peticion("Bearer x"), undefined)).status).toBe(200);
    });

    it("la sesión cerrada, la vencida y la inexistente dan el mismo mensaje (no orientan a quien ataca)", async () => {
      const cerrada = await deps(usuarioBase, { sesionAbierta: false });
      const vencida = await deps(usuarioBase, { expiraEn: new Date(AHORA.getTime() - 1000) });
      const sinUsuario = await deps(null);
      const mensajes = new Set<string>();
      for (const { dependencias } of [cerrada, vencida, sinUsuario]) {
        const error = (await requireAuth(() => Response.json({}), dependencias)(peticion("Bearer x"), undefined).catch((e: unknown) => e)) as Error;
        mensajes.add(error.message);
      }

      expect(mensajes.size).toBe(1);
    });
  });
});
