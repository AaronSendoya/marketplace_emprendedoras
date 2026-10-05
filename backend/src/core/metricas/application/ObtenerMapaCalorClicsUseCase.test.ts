import { describe, expect, it } from "vitest";
import { FakeClock } from "@/shared/testing/FakeClock";
import type { ClicDiarioPerfil, ItemRankingClic, OrdenMapaCalor, TotalPorPerfil } from "../domain/Clic";
import type { RangoFechas } from "../domain/RangoFechas";
import { ObtenerMapaCalorClicsUseCase } from "./ObtenerMetricasUseCase";

const AHORA = new Date("2026-10-04T12:00:00Z");

interface Llamada {
  metodo: "ranking" | "clicsDiariosPorPerfil" | "totalesPorPerfil";
  limite?: number;
  orden?: OrdenMapaCalor;
  perfilIds?: string[];
  rango: RangoFechas;
}

class RepositorioFalso {
  llamadas: Llamada[] = [];

  constructor(
    private readonly top: ItemRankingClic[],
    private readonly diarios: ClicDiarioPerfil[],
    private readonly anteriores: TotalPorPerfil[] = [],
  ) {}

  async ranking(limite: number, rango: RangoFechas, orden?: OrdenMapaCalor) {
    this.llamadas.push({ metodo: "ranking", limite, rango, orden });
    return this.top;
  }

  async clicsDiariosPorPerfil(perfilIds: string[], rango: RangoFechas) {
    this.llamadas.push({ metodo: "clicsDiariosPorPerfil", perfilIds, rango });
    return this.diarios;
  }

  async totalesPorPerfil(perfilIds: string[], rango: RangoFechas) {
    this.llamadas.push({ metodo: "totalesPorPerfil", perfilIds, rango });
    return this.anteriores;
  }

  llamada(metodo: Llamada["metodo"]): Llamada {
    return this.llamadas.find((l) => l.metodo === metodo)!;
  }
}

const TOP = [{ perfilId: "p-1", nombreNegocio: "Dulces de Ana", whatsapp: 3, instagram: 1, total: 4 }];

describe("ObtenerMapaCalorClicsUseCase (regla 19)", () => {
  it("pide el top con el límite, el rango y el orden, y luego los clics diarios de esas mismas cuentas", async () => {
    const repo = new RepositorioFalso(TOP, [{ perfilId: "p-1", fecha: "2026-10-02", whatsapp: 3, instagram: 1 }]);

    const mapa = await new ObtenerMapaCalorClicsUseCase(repo, new FakeClock(AHORA)).ejecutar(5, { desde: "2026-10-01", hasta: "2026-10-04" }, "whatsapp");

    expect(repo.llamada("ranking")).toMatchObject({ limite: 5, orden: "whatsapp" });
    expect(repo.llamada("clicsDiariosPorPerfil").perfilIds).toEqual(["p-1"]);
    expect(repo.llamada("clicsDiariosPorPerfil").rango).toEqual(repo.llamada("ranking").rango);
    expect(mapa.columnas).toHaveLength(4);
    expect(mapa.filas[0]).toMatchObject({ nombreNegocio: "Dulces de Ana", total: 4 });
  });

  it("sin orden usa el total", async () => {
    const repo = new RepositorioFalso([], []);

    await new ObtenerMapaCalorClicsUseCase(repo, new FakeClock(AHORA)).ejecutar(10);

    expect(repo.llamada("ranking").orden).toBe("total");
  });

  it("compara contra el período anterior de igual duración y lo deja en total_anterior", async () => {
    const repo = new RepositorioFalso(TOP, [{ perfilId: "p-1", fecha: "2026-10-02", whatsapp: 3, instagram: 1 }], [{ perfilId: "p-1", total: 2 }]);

    const mapa = await new ObtenerMapaCalorClicsUseCase(repo, new FakeClock(AHORA)).ejecutar(10, { desde: "2026-10-01", hasta: "2026-10-04" });

    const actual = repo.llamada("ranking").rango;
    const anterior = repo.llamada("totalesPorPerfil").rango;
    // 4 días (1 a 4 de octubre): el anterior son los 4 días previos (27 a 30 de septiembre).
    expect(anterior.hasta.getTime()).toBe(actual.desde.getTime() - 1);
    expect(actual.desde.getTime() - anterior.desde.getTime()).toBe(4 * 24 * 60 * 60 * 1000);
    expect(repo.llamada("totalesPorPerfil").perfilIds).toEqual(["p-1"]);
    expect(mapa.filas[0].totalAnterior).toBe(2);
  });

  it("una cuenta sin clics en el período anterior queda con total_anterior en 0", async () => {
    const repo = new RepositorioFalso(TOP, [{ perfilId: "p-1", fecha: "2026-10-02", whatsapp: 3, instagram: 1 }], []);

    const mapa = await new ObtenerMapaCalorClicsUseCase(repo, new FakeClock(AHORA)).ejecutar(10, { desde: "2026-10-01", hasta: "2026-10-04" });

    expect(mapa.filas[0].totalAnterior).toBe(0);
  });

  it("sin entrada usa los últimos 30 días hasta hoy", async () => {
    const repo = new RepositorioFalso([], []);

    const mapa = await new ObtenerMapaCalorClicsUseCase(repo, new FakeClock(AHORA)).ejecutar(10);

    expect(mapa.granularidad).toBe("dia");
    expect(mapa.columnas).toHaveLength(30);
    expect(mapa.columnas.at(-1)?.fin).toBe("2026-10-04");
    expect(mapa.filas).toEqual([]);
  });

  it("un rango inválido falla antes de consultar nada", async () => {
    const repo = new RepositorioFalso([], []);
    const casoDeUso = new ObtenerMapaCalorClicsUseCase(repo, new FakeClock(AHORA));

    await expect(casoDeUso.ejecutar(10, { desde: "2026-10-04", hasta: "2026-10-01" })).rejects.toThrow();
    expect(repo.llamadas).toHaveLength(0);
  });
});
