import { describe, expect, it } from "vitest";
import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { obtenerHealth } from "./health.controller";

const silencioso = { info: () => {}, warn: () => {}, error: () => {} };
const peticion = new Request("http://localhost/api/v1/health");

describe("obtenerHealth", () => {
  it("responde 200 cuando la base contesta", async () => {
    const consultas: string[] = [];
    const db: EjecutorSql = {
      consultar: async (texto) => (consultas.push(texto), []) as never,
      ejecutar: async () => ({ filasAfectadas: 0 }),
    };

    const respuesta = await obtenerHealth(db);

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "ok", base_de_datos: "ok" });
    expect(consultas).toEqual(["SELECT 1"]);
  });

  it("con la base caída responde 500 estándar y sin detalles internos", async () => {
    const db: EjecutorSql = {
      consultar: async () => {
        throw new Error("connect ECONNREFUSED mysql://usuario:clave@host/db");
      },
      ejecutar: async () => ({ filasAfectadas: 0 }),
    };

    const respuesta = await withErrorHandling(() => obtenerHealth(db), silencioso)(peticion, undefined);
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(500);
    expect(cuerpo.error.codigo).toBe("ERROR_INTERNO");
    expect(JSON.stringify(cuerpo)).not.toContain("clave");
  });
});
