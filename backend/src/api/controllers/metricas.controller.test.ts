import { describe, expect, it } from "vitest";
import type {
  ObtenerClicsPorRubroUseCase,
  ObtenerMapaCalorClicsUseCase,
  ObtenerRankingClicsUseCase,
  ObtenerResumenClicsUseCase,
  ObtenerSerieClicsUseCase,
} from "@/core/metricas/application/ObtenerMetricasUseCase";
import type { RegistrarClicUseCase } from "@/core/metricas/application/RegistrarClicUseCase";
import {
  obtenerClicsPorRubro,
  obtenerMapaCalorClics,
  obtenerRankingClics,
  obtenerResumenClics,
  obtenerSerieClics,
  registrarClic,
} from "./metricas.controller";

describe("controlador de métricas (regla 19)", () => {
  it("registrarClic pasa el perfil y el tipo al caso de uso y responde 204 sin cuerpo", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
      },
    } as unknown as RegistrarClicUseCase;

    const respuesta = await registrarClic(usecase, "perfil-1", "whatsapp");

    expect(respuesta.status).toBe(204);
    expect(recibido).toEqual(["perfil-1", "whatsapp"]);
  });

  it("obtenerResumenClics pasa el rango y responde los totales", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return { whatsapp: 12, instagram: 3 };
      },
    } as unknown as ObtenerResumenClicsUseCase;

    const cuerpo = await obtenerResumenClics(usecase, { desde: "2026-09-01", hasta: "2026-10-01" }).then((r) => r.json());

    expect(recibido).toEqual([{ desde: "2026-09-01", hasta: "2026-10-01" }]);
    expect(cuerpo).toEqual({ whatsapp: 12, instagram: 3 });
  });

  it("obtenerRankingClics pasa el límite y el rango, y serializa en snake_case", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return [{ perfilId: "perfil-1", nombreNegocio: "Dulces de Ana", whatsapp: 5, instagram: 2, total: 7 }];
      },
    } as unknown as ObtenerRankingClicsUseCase;

    const cuerpo = await obtenerRankingClics(usecase, 5, { desde: "2026-09-01", hasta: "2026-10-01" }).then((r) => r.json());

    expect(recibido).toEqual([5, { desde: "2026-09-01", hasta: "2026-10-01" }]);
    expect(cuerpo).toEqual([{ perfil_id: "perfil-1", nombre_negocio: "Dulces de Ana", whatsapp: 5, instagram: 2, total: 7 }]);
  });

  it("obtenerSerieClics pasa el rango y responde la serie", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return [{ fecha: "2026-10-01", whatsapp: 2, instagram: 1 }];
      },
    } as unknown as ObtenerSerieClicsUseCase;

    const cuerpo = await obtenerSerieClics(usecase, { desde: "2026-09-01", hasta: "2026-10-01" }).then((r) => r.json());

    expect(recibido).toEqual([{ desde: "2026-09-01", hasta: "2026-10-01" }]);
    expect(cuerpo).toEqual([{ fecha: "2026-10-01", whatsapp: 2, instagram: 1 }]);
  });

  it("obtenerClicsPorRubro pasa el rango y responde la distribución", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return [{ rubro: "Alimentos y bebidas", total: 10 }];
      },
    } as unknown as ObtenerClicsPorRubroUseCase;

    const cuerpo = await obtenerClicsPorRubro(usecase, { desde: "2026-09-01", hasta: "2026-10-01" }).then((r) => r.json());

    expect(recibido).toEqual([{ desde: "2026-09-01", hasta: "2026-10-01" }]);
    expect(cuerpo).toEqual([{ rubro: "Alimentos y bebidas", total: 10 }]);
  });

  it("obtenerMapaCalorClics pasa el límite, el rango y el orden, y serializa las filas en snake_case", async () => {
    let recibido: unknown[] = [];
    const usecase = {
      ejecutar: async (...args: unknown[]) => {
        recibido = args;
        return {
          granularidad: "dia",
          columnas: [{ inicio: "2026-10-01", fin: "2026-10-01" }],
          filas: [
            {
              perfilId: "perfil-1",
              nombreNegocio: "Dulces de Ana",
              whatsapp: 2,
              instagram: 1,
              total: 3,
              totalAnterior: 2,
              celdas: [{ whatsapp: 2, instagram: 1 }],
            },
          ],
        };
      },
    } as unknown as ObtenerMapaCalorClicsUseCase;

    const cuerpo = await obtenerMapaCalorClics(usecase, 5, { desde: "2026-10-01", hasta: "2026-10-01" }, "instagram").then((r) => r.json());

    expect(recibido).toEqual([5, { desde: "2026-10-01", hasta: "2026-10-01" }, "instagram"]);
    expect(cuerpo).toEqual({
      granularidad: "dia",
      columnas: [{ inicio: "2026-10-01", fin: "2026-10-01" }],
      filas: [
        {
          perfil_id: "perfil-1",
          nombre_negocio: "Dulces de Ana",
          whatsapp: 2,
          instagram: 1,
          total: 3,
          total_anterior: 2,
          celdas: [{ whatsapp: 2, instagram: 1 }],
        },
      ],
    });
  });
});
