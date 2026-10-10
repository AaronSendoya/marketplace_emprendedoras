import { describe, expect, it } from "vitest";
import { esErrorDeNoDisponibilidad } from "./disponibilidad";

const conCodigo = (code: string, extra: Record<string, unknown> = {}) => Object.assign(new Error(`falló ${code}`), { code, ...extra });

describe("esErrorDeNoDisponibilidad", () => {
  it.each(["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "PROTOCOL_CONNECTION_LOST", "ER_CON_COUNT_ERROR", "ENOTFOUND", "POOL_CLOSED"])(
    "reconoce %s como base de datos fuera de alcance",
    (code) => {
      expect(esErrorDeNoDisponibilidad(conCodigo(code))).toBe(true);
    },
  );

  it("reconoce el error envuelto en `cause`", () => {
    expect(esErrorDeNoDisponibilidad(new Error("consulta fallida", { cause: conCodigo("ECONNREFUSED") }))).toBe(true);
  });

  it("reconoce un AggregateError cuando todas las direcciones fallaron", () => {
    const agregado = Object.assign(new AggregateError([conCodigo("ECONNREFUSED"), conCodigo("ECONNREFUSED")], "todas fallaron"), {});
    expect(esErrorDeNoDisponibilidad(agregado)).toBe(true);
  });

  it("un AggregateError mezclado con errores de otra clase no cuenta", () => {
    const mezclado = new AggregateError([conCodigo("ECONNREFUSED"), new Error("otra cosa")], "mezcla");
    expect(esErrorDeNoDisponibilidad(mezclado)).toBe(false);
  });

  it("un error de la consulta (restricción, sintaxis, bloqueo) sigue siendo un fallo de la aplicación", () => {
    for (const code of ["ER_DUP_ENTRY", "ER_PARSE_ERROR", "ER_LOCK_DEADLOCK", "ER_NO_SUCH_TABLE", "ER_DATA_TOO_LONG"]) {
      expect(esErrorDeNoDisponibilidad(conCodigo(code)), code).toBe(false);
    }
  });

  it("lo que no es un error no cuenta, y una cadena circular de causas no cuelga", () => {
    for (const valor of [null, undefined, "ECONNREFUSED", 42, {}, []]) expect(esErrorDeNoDisponibilidad(valor)).toBe(false);
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = { cause: a };
    a.cause = b;
    expect(esErrorDeNoDisponibilidad(a)).toBe(false);
  });
});
