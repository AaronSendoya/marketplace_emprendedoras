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

  describe("búsqueda con resultados similares (regla 20)", () => {
    const repoConTexto = () => {
      const repositorio = new PerfilRepositoryEnMemoria([
        perfilDePrueba({ id: "p1", usuarioId: "u1", nombreNegocio: "Dulces de prueba", nombreEmprendedora: "Aaron Mamani" }),
        perfilDePrueba({ id: "p2", usuarioId: "u2", nombreNegocio: "Café Andino", nombreEmprendedora: "María Flores", ciudad: { id: "ciudad-2", nombre: "Cochabamba" } }),
        perfilDePrueba({ id: "p3", usuarioId: "u3", nombreNegocio: "Dulcería Lucía", nombreEmprendedora: "Lucía Choque", usuarioActivo: false }),
      ]);
      repositorio.productos = { p2: [{ nombre: "Grano tostado", descripcion: null }] };
      return repositorio;
    };
    const buscar = (q: string, filtros: { ciudadId?: string } = {}, pagina = { pagina: 1, limite: 20 }) =>
      new GetPerfilesUseCase(repoConTexto()).ejecutar({ q, ...filtros }, pagina);

    it("con una coincidencia exacta devuelve solo las exactas, sin marcarlas como parecidas", async () => {
      const resultado = await buscar("dulces");

      expect(resultado.datos.map((p) => p.id)).toEqual(["p1"]);
      expect(resultado.similares).toBe(false);
    });

    it("sin ninguna coincidencia exacta devuelve los parecidos y lo dice", async () => {
      const resultado = await buscar("dulses");

      expect(resultado.datos.map((p) => p.id)).toEqual(["p1"]);
      expect(resultado.total).toBe(1);
      expect(resultado.similares).toBe(true);
    });

    it("encuentra un nombre de persona y un producto mal escritos", async () => {
      expect((await buscar("aarun")).datos.map((p) => p.id)).toEqual(["p1"]);
      expect((await buscar("tostdo")).datos.map((p) => p.id)).toEqual(["p2"]);
    });

    it("no devuelve perfiles de cuentas desactivadas (regla 18)", async () => {
      expect((await buscar("lusia")).datos).toEqual([]);
    });

    it("respeta la ciudad: un parecido de otra ciudad no aparece", async () => {
      expect((await buscar("dulses", { ciudadId: "ciudad-2" })).datos).toEqual([]);
      expect((await buscar("cafe", { ciudadId: "ciudad-2" })).datos.map((p) => p.id)).toEqual(["p2"]);
    });

    it("sin parecidos responde vacío y sin marcar como parecidos", async () => {
      const resultado = await buscar("zapatos");

      expect(resultado).toEqual({ datos: [], total: 0, similares: false });
    });

    it("pagina los parecidos y el total es el de todos", async () => {
      const repositorio = new PerfilRepositoryEnMemoria(
        ["a", "b", "c"].map((letra) => perfilDePrueba({ id: letra, usuarioId: letra, nombreNegocio: `Dulces ${letra}` })),
      );
      const usecase = new GetPerfilesUseCase(repositorio);

      const segunda = await usecase.ejecutar({ q: "dulses" }, { pagina: 2, limite: 2 });

      expect(segunda.datos.map((p) => p.id)).toEqual(["c"]);
      expect(segunda.total).toBe(3);
      expect(segunda.similares).toBe(true);
    });

    it("sin texto de búsqueda no intenta nada parecido", async () => {
      const resultado = await new GetPerfilesUseCase(repoConTexto()).ejecutar({ ciudadId: "ciudad-1" }, { pagina: 1, limite: 20 });

      expect(resultado.similares).toBe(false);
    });
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
