import { describe, expect, it } from "vitest";
import { perfilDePrueba, PerfilRepositoryEnMemoria } from "@/core/perfiles/testing/dobles";
import { ErrorNoEncontrado } from "@/shared/domain/errors";
import { FakeClock } from "@/shared/testing/FakeClock";
import { productoDePrueba, ProductoRepositoryEnMemoria } from "../testing/dobles";
import { GetMarketplaceUseCase, GetProductoMarketplaceUseCase, ListMisProductosUseCase } from "./ConsultasProducto";

const clock = new FakeClock(new Date("2026-09-23T12:00:00Z"));
const inactiva = { ...productoDePrueba().perfil, usuarioActivo: false };

const repo = () =>
  new ProductoRepositoryEnMemoria([
    productoDePrueba({ id: "p1" }),
    productoDePrueba({ id: "p2", activo: false }),
    productoDePrueba({ id: "p3", perfil: inactiva }),
    productoDePrueba({ id: "p4", perfilId: "perfil-2" }),
  ]);

describe("consultas de productos (regla 18)", () => {
  it("el feed solo trae productos activos de cuentas activas", async () => {
    const { datos, total } = await new GetMarketplaceUseCase(repo(), clock).ejecutar({}, { pagina: 1, limite: 20 });

    expect(datos.map((p) => p.id)).toEqual(["p1", "p4"]);
    expect(total).toBe(2);
  });

  describe("búsqueda con resultados similares (regla 21)", () => {
    const base = productoDePrueba().perfil;
    const repoConTexto = () =>
      new ProductoRepositoryEnMemoria([
        productoDePrueba({ id: "torta", nombre: "Torta de chocolate", descripcion: "Con cobertura" }),
        productoDePrueba({
          id: "cafe",
          nombre: "Café molido",
          descripcion: "Grano de los Yungas",
          perfil: { ...base, id: "perfil-2", nombreNegocio: "Café Andino", ciudad: { id: "ciudad-2", nombre: "Cochabamba" } },
        }),
        productoDePrueba({ id: "oculto", nombre: "Torta oculta", activo: false }),
        productoDePrueba({ id: "desactivada", nombre: "Torta de cuenta desactivada", perfil: inactiva }),
      ]);
    const buscar = (q: string, filtros: { ciudadId?: string } = {}, pagina = { pagina: 1, limite: 20 }) =>
      new GetMarketplaceUseCase(repoConTexto(), clock).ejecutar({ q, ...filtros }, pagina);

    it("con una coincidencia exacta devuelve solo las exactas, sin marcarlas como parecidas", async () => {
      const resultado = await buscar("torta");

      expect(resultado.datos.map((p) => p.id)).toEqual(["torta"]);
      expect(resultado.similares).toBe(false);
    });

    it("busca también en el nombre del negocio", async () => {
      expect((await buscar("andino")).datos.map((p) => p.id)).toEqual(["cafe"]);
      expect((await buscar("dulces de ana")).datos.map((p) => p.id)).toEqual(["torta"]);
    });

    it("sin ninguna coincidencia exacta devuelve los productos parecidos y lo dice", async () => {
      const resultado = await buscar("trota");

      expect(resultado.datos.map((p) => p.id)).toEqual(["torta"]);
      expect(resultado.total).toBe(1);
      expect(resultado.similares).toBe(true);
    });

    it("encuentra un producto, una descripción y un negocio mal escritos", async () => {
      expect((await buscar("cafee")).datos.map((p) => p.id)).toEqual(["cafe"]);
      expect((await buscar("cobertura de chocolte")).datos.map((p) => p.id)).toEqual(["torta"]);
      expect((await buscar("dulses de ana")).datos.map((p) => p.id)).toEqual(["torta"]);
    });

    it("no devuelve productos ocultos ni de cuentas desactivadas (regla 18)", async () => {
      expect((await buscar("ocultaa")).datos).toEqual([]);
      expect((await buscar("desactivda")).datos).toEqual([]);
    });

    it("respeta la ciudad: un parecido de otra ciudad no aparece", async () => {
      expect((await buscar("cafee", { ciudadId: "ciudad-1" })).datos).toEqual([]);
      expect((await buscar("cafee", { ciudadId: "ciudad-2" })).datos.map((p) => p.id)).toEqual(["cafe"]);
    });

    it("sin parecidos responde vacío y sin marcar como parecidos", async () => {
      expect(await buscar("zapatos")).toEqual({ datos: [], total: 0, similares: false });
    });

    it("pagina los parecidos y el total es el de todos", async () => {
      const repositorio = new ProductoRepositoryEnMemoria(
        ["a", "b", "c"].map((letra) => productoDePrueba({ id: letra, nombre: `Tortas ${letra}`, descripcion: null })),
      );

      const segunda = await new GetMarketplaceUseCase(repositorio, clock).ejecutar({ q: "trotas" }, { pagina: 2, limite: 2 });

      expect(segunda.datos.map((p) => p.id)).toEqual(["c"]);
      expect(segunda.total).toBe(3);
      expect(segunda.similares).toBe(true);
    });

    it("sin texto de búsqueda no intenta nada parecido", async () => {
      const resultado = await new GetMarketplaceUseCase(repoConTexto(), clock).ejecutar({ ciudadId: "ciudad-1" }, { pagina: 1, limite: 20 });

      expect(resultado.similares).toBe(false);
    });
  });

  it("el detalle de un producto inactivo, de una cuenta desactivada o inexistente da 404", async () => {
    const usecase = new GetProductoMarketplaceUseCase(repo(), clock);

    await expect(usecase.ejecutar("p1")).resolves.toMatchObject({ id: "p1" });
    for (const id of ["p2", "p3", "nada"]) await expect(usecase.ejecutar(id)).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("mis productos incluye los inactivos; sin perfil devuelve una lista vacía (no un error)", async () => {
    const perfiles = new PerfilRepositoryEnMemoria([perfilDePrueba({ id: "perfil-1", usuarioId: "usuario-1" })]);
    const usecase = new ListMisProductosUseCase(repo(), perfiles, clock);

    const propios = await usecase.ejecutar("usuario-1", { pagina: 1, limite: 20 });
    const sinPerfil = await usecase.ejecutar("usuario-9", { pagina: 1, limite: 20 });

    expect(propios.datos.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    expect(sinPerfil).toEqual({ datos: [], total: 0 });
  });
});
