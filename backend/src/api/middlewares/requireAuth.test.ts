import { describe, expect, it } from "vitest";
import type { ITokenService } from "@/core/auth/domain/ITokenService";
import type { Usuario } from "@/core/auth/domain/Usuario";
import { ErrorNoAutenticado } from "@/shared/domain/errors";
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

function deps(usuario: Usuario | null, tv = usuario?.tokenVersion ?? 0): DependenciasAuth {
  return {
    usuarios: { buscarPorId: async () => usuario },
    tokens: { emitir: async () => "x", verificar: async () => ({ sub: usuario?.id ?? "?", tv }) } as ITokenService,
  };
}

const peticion = (authorization?: string) =>
  new Request("http://localhost/api/v1/x", { headers: authorization ? { authorization } : {} });

describe("requireAuth", () => {
  it("llama al manejador con el usuario, sin el hash de la contraseña", async () => {
    const manejador = requireAuth((_req, _ctx, usuario) => Response.json(usuario), deps(usuarioBase));

    const respuesta = await manejador(peticion("Bearer token-valido"), undefined);
    const cuerpo = await respuesta.json();

    expect(cuerpo.id).toBe("u1");
    expect(cuerpo).not.toHaveProperty("passwordHash");
  });

  it("sin cabecera Authorization, rechaza sin llamar al manejador", async () => {
    const manejador = requireAuth(() => {
      throw new Error("no debería llamarse");
    }, deps(usuarioBase));

    await expect(manejador(peticion(), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it.each(["Token x", "Bearer", "Basic x"])("rechaza la cabecera Authorization: %s", async (valor) => {
    const manejador = requireAuth(() => Response.json({}), deps(usuarioBase));

    await expect(manejador(peticion(valor), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza si el usuario ya no existe", async () => {
    const manejador = requireAuth(() => Response.json({}), deps(null));

    await expect(manejador(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza una cuenta inactiva", async () => {
    const manejador = requireAuth(() => Response.json({}), deps({ ...usuarioBase, activo: false }));

    await expect(manejador(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });

  it("rechaza si token_version no coincide con la de la base (p. ej. tras restablecer la contraseña)", async () => {
    const manejador = requireAuth(() => Response.json({}), deps(usuarioBase, usuarioBase.tokenVersion - 1));

    await expect(manejador(peticion("Bearer x"), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });
});
