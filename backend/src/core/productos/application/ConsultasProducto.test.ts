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
