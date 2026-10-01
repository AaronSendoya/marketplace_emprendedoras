import { describe, expect, it } from "vitest";
import { ErrorNoEncontrado } from "@/shared/domain/errors";
import { perfilDePrueba, PerfilRepositoryEnMemoria } from "../testing/dobles";
import { GetMiPerfilUseCase, GetPerfilesUseCase, GetPerfilUseCase } from "./ConsultasPerfil";

const repo = () =>
  new PerfilRepositoryEnMemoria([
    perfilDePrueba({ id: "p1", usuarioId: "u1" }),
    perfilDePrueba({ id: "p2", usuarioId: "u2", usuarioActivo: false, ciudad: { id: "ciudad-2", nombre: "Cochabamba" } }),
    perfilDePrueba({ id: "p3", usuarioId: "u3", ciudad: { id: "ciudad-2", nombre: "Cochabamba" } }),
  ]);

describe("consultas de perfiles (regla 18)", () => {
  it("el feed no incluye perfiles de cuentas desactivadas", async () => {
    const { datos, total } = await new GetPerfilesUseCase(repo()).ejecutar({}, { pagina: 1, limite: 20 });

    expect(datos.map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(total).toBe(2);
  });

  it("filtra por ciudad y pagina", async () => {
    const usecase = new GetPerfilesUseCase(repo());

    expect((await usecase.ejecutar({ ciudadId: "ciudad-2" }, { pagina: 1, limite: 20 })).datos.map((p) => p.id)).toEqual(["p3"]);
    expect((await usecase.ejecutar({}, { pagina: 2, limite: 1 })).datos.map((p) => p.id)).toEqual(["p3"]);
  });

  it("el detalle de un perfil activo se ve; el de una cuenta desactivada o inexistente da 404", async () => {
    const usecase = new GetPerfilUseCase(repo());

    await expect(usecase.ejecutar("p1")).resolves.toMatchObject({ id: "p1" });
    await expect(usecase.ejecutar("p2")).rejects.toBeInstanceOf(ErrorNoEncontrado);
    await expect(usecase.ejecutar("nada")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("mi perfil devuelve el propio, o 404 si todavía no existe", async () => {
    const usecase = new GetMiPerfilUseCase(repo());

    await expect(usecase.ejecutar("u1")).resolves.toMatchObject({ id: "p1" });
    await expect(usecase.ejecutar("sin-perfil")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});
