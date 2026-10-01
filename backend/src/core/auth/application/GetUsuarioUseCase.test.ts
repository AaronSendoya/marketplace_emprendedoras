import { describe, expect, it } from "vitest";
import { ErrorNoEncontrado } from "@/shared/domain/errors";
import { usuarioDePrueba } from "../testing/dobles";
import { UsuarioRepositoryEnMemoria } from "../testing/UsuarioRepositoryEnMemoria";
import { GetUsuarioUseCase } from "./GetUsuarioUseCase";

describe("GetUsuarioUseCase (base del módulo \"Emprendimientos\" del panel)", () => {
  it("devuelve la cuenta existente", async () => {
    const repo = new UsuarioRepositoryEnMemoria([usuarioDePrueba({ id: "usuario-1" })]);

    await expect(new GetUsuarioUseCase(repo).ejecutar("usuario-1")).resolves.toMatchObject({ id: "usuario-1" });
  });

  it("una cuenta que no existe da 404", async () => {
    const repo = new UsuarioRepositoryEnMemoria([]);

    await expect(new GetUsuarioUseCase(repo).ejecutar("no-existe")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});
