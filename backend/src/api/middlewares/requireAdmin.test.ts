import { describe, expect, it } from "vitest";
import type { ITokenService } from "@/core/auth/domain/ITokenService";
import type { Usuario } from "@/core/auth/domain/Usuario";
import { ErrorProhibido } from "@/shared/domain/errors";
import { requireAdmin } from "./requireAdmin";
import type { DependenciasAuth } from "./requireAuth";

const base: Omit<Usuario, "rol"> = {
  id: "u1",
  email: "a@b.com",
  nombres: "Ana",
  apellidoPaterno: "Perez",
  apellidoMaterno: null,
  passwordHash: "x",
  activo: true,
  emailVerificadoEn: null,
  tokenVersion: 0,
  creadoEn: new Date(0),
};

function deps(usuario: Usuario): DependenciasAuth {
  return {
    usuarios: { buscarPorId: async () => usuario },
    tokens: { emitir: async () => "x", verificar: async () => ({ sub: usuario.id, tv: usuario.tokenVersion }) } as ITokenService,
  };
}

const peticion = new Request("http://localhost/api/v1/x", { headers: { authorization: "Bearer x" } });

describe("requireAdmin", () => {
  it("deja pasar a un Admin", async () => {
    const manejador = requireAdmin(() => Response.json({ ok: true }), deps({ ...base, rol: "Admin" }));

    expect((await manejador(peticion, undefined)).status).toBe(200);
  });

  it("rechaza a un Emprendedor con PROHIBIDO (regla 5: un token de Emprendedor no pasa requireAdmin)", async () => {
    const manejador = requireAdmin(() => Response.json({}), deps({ ...base, rol: "Emprendedor" }));

    await expect(manejador(peticion, undefined)).rejects.toBeInstanceOf(ErrorProhibido);
  });
});
