import { describe, expect, it, vi } from "vitest";
import { habilitarMultiplesSentenciasEnTiDB } from "./conexion";

describe("habilitarMultiplesSentenciasEnTiDB", () => {
  it("envía SET SESSION tidb_multi_statement_mode = 'ON'", async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    await habilitarMultiplesSentenciasEnTiDB({ query });
    expect(query).toHaveBeenCalledWith("SET SESSION tidb_multi_statement_mode = 'ON'");
  });

  it("en MySQL o MariaDB (variable inexistente, errno 1193) no falla: no es TiDB", async () => {
    const query = vi.fn().mockRejectedValue(Object.assign(new Error("Unknown system variable"), { errno: 1193 }));
    await expect(habilitarMultiplesSentenciasEnTiDB({ query })).resolves.toBeUndefined();
  });

  it("cualquier otro error se propaga (no se traga fallos reales de conexión)", async () => {
    const query = vi.fn().mockRejectedValue(Object.assign(new Error("Conexión perdida"), { errno: 2013 }));
    await expect(habilitarMultiplesSentenciasEnTiDB({ query })).rejects.toThrow("Conexión perdida");
  });
});
