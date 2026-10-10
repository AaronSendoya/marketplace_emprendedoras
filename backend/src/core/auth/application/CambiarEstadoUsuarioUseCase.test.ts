import { describe, expect, it } from "vitest";
import { requireAuth } from "@/api/middlewares/requireAuth";
import { ErrorConflicto, ErrorNoAutenticado, ErrorNoEncontrado } from "@/shared/domain/errors";
import { JwtTokenService } from "../infrastructure/JwtTokenService";
import { SystemClock } from "@/shared/infrastructure/SystemClock";
import { LoggerFalso, usuarioDePrueba } from "../testing/dobles";
import { emitirConSesion, SesionRepositoryEnMemoria } from "../testing/SesionRepositoryEnMemoria";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { CambiarEstadoUsuarioUseCase } from "./CambiarEstadoUsuarioUseCase";

function construir() {
  const repo = new UsuarioRepositoryEnMemoria([
    usuarioDePrueba({ id: "admin-1", email: "admin@gmail.com", rol: "Admin" }),
    usuarioDePrueba({ id: "usuario-1" }),
  ]);
  const logger = new LoggerFalso();
  return { repo, logger, useCase: new CambiarEstadoUsuarioUseCase(repo, logger) };
}

describe("CambiarEstadoUsuarioUseCase", () => {
  it("desactiva una cuenta, la devuelve inactiva y registra el evento", async () => {
    const { repo, logger, useCase } = construir();

    const usuario = await useCase.ejecutar("admin-1", "usuario-1", false);

    expect(usuario).toMatchObject({ id: "usuario-1", activo: false });
    expect(repo.usuarios[1].activo).toBe(false);
    expect(logger.registros).toEqual([
      { nivel: "info", evento: "cuenta_estado_cambiado", datos: { usuarioId: "usuario-1", adminId: "admin-1", activo: false } },
    ]);
  });

  it("vuelve a activar una cuenta desactivada", async () => {
    const { repo, useCase } = construir();
    await useCase.ejecutar("admin-1", "usuario-1", false);

    const usuario = await useCase.ejecutar("admin-1", "usuario-1", true);

    expect(usuario.activo).toBe(true);
    expect(repo.usuarios[1].activo).toBe(true);
  });

  it("es idempotente: repetir el mismo estado no cambia nada ni registra otro evento", async () => {
    const { logger, useCase } = construir();

    await useCase.ejecutar("admin-1", "usuario-1", true);

    expect(logger.registros).toHaveLength(0);
  });

  it("un Admin no puede desactivar su propia cuenta (409)", async () => {
    const { repo, useCase } = construir();

    await expect(useCase.ejecutar("admin-1", "admin-1", false)).rejects.toBeInstanceOf(ErrorConflicto);

    expect(repo.usuarios[0].activo).toBe(true);
  });

  it("puede desactivar a otro Admin", async () => {
    const { repo, useCase } = construir();
    repo.usuarios.push(usuarioDePrueba({ id: "admin-2", email: "admin2@gmail.com", rol: "Admin" }));

    await expect(useCase.ejecutar("admin-1", "admin-2", false)).resolves.toMatchObject({ activo: false });
  });

  it("una cuenta que no existe da 404", async () => {
    const { useCase } = construir();

    await expect(useCase.ejecutar("admin-1", "no-existe", false)).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("desactivar una cuenta hace que su token deje de valer en la siguiente petición (regla 5)", async () => {
    const { repo, useCase } = construir();
    const tokens = new JwtTokenService("secreto-de-prueba-de-al-menos-32-caracteres");
    const sesiones = new SesionRepositoryEnMemoria();
    const token = await emitirConSesion(tokens, sesiones, { id: "usuario-1", tokenVersion: 3, rol: "Emprendedor" });
    const protegida = requireAuth(() => new Response("ok"), { usuarios: repo, sesiones, tokens, clock: new SystemClock() });
    const peticion = () => new Request("http://localhost/x", { headers: { authorization: `Bearer ${token}` } });
    expect((await protegida(peticion(), undefined)).status).toBe(200);

    await useCase.ejecutar("admin-1", "usuario-1", false);

    await expect(protegida(peticion(), undefined)).rejects.toBeInstanceOf(ErrorNoAutenticado);
  });
});
