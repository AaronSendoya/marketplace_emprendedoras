import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { diasDelRango, rangoAnterior, resolverRango } from "./RangoFechas";

// 2026-10-02T12:00:00Z = 08:00 de La Paz (UTC-4): mismo día de calendario que en UTC.
const AHORA = new Date("2026-10-02T12:00:00Z");

describe("resolverRango", () => {
  it("sin parámetros, trae los últimos 30 días (de La Paz) hasta hoy", () => {
    const rango = resolverRango(undefined, AHORA);

    expect(diasDelRango(rango)).toHaveLength(30);
    expect(diasDelRango(rango).at(0)).toBe("2026-09-03");
    expect(diasDelRango(rango).at(-1)).toBe("2026-10-02");
  });

  it("con desde y hasta explícitos, día completo de La Paz (00:00:00 a 23:59:59.999)", () => {
    const rango = resolverRango({ desde: "2026-10-01", hasta: "2026-10-01" }, AHORA);

    // 00:00:00 de La Paz = 04:00:00 UTC; 23:59:59.999 de La Paz = 03:59:59.999 UTC del día siguiente.
    expect(rango.desde.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    expect(rango.hasta.toISOString()).toBe("2026-10-02T03:59:59.999Z");
  });

  it("solo hasta explícito: desde se calcula a partir de ese hasta, no de hoy", () => {
    const rango = resolverRango({ hasta: "2026-01-15" }, AHORA);

    expect(diasDelRango(rango).at(0)).toBe("2025-12-17");
    expect(diasDelRango(rango).at(-1)).toBe("2026-01-15");
  });

  it("rechaza hasta anterior a desde", () => {
    expect(() => resolverRango({ desde: "2026-10-05", hasta: "2026-10-01" }, AHORA)).toThrow(ErrorValidacion);
  });

  it("rechaza un formato inválido o una fecha inexistente", () => {
    expect(() => resolverRango({ desde: "2026/10/01" }, AHORA)).toThrow(ErrorValidacion);
    expect(() => resolverRango({ desde: "2026-02-30" }, AHORA)).toThrow(ErrorValidacion);
  });

  it("rechaza un rango de más de 2 años", () => {
    expect(() => resolverRango({ desde: "2020-01-01", hasta: "2026-10-02" }, AHORA)).toThrow(ErrorValidacion);
  });
});

describe("diasDelRango", () => {
  it("un solo día da un solo elemento", () => {
    const rango = resolverRango({ desde: "2026-10-01", hasta: "2026-10-01" }, AHORA);

    expect(diasDelRango(rango)).toEqual(["2026-10-01"]);
  });

  it("cruza el fin de mes sin perder ni repetir días", () => {
    const rango = resolverRango({ desde: "2026-09-29", hasta: "2026-10-02" }, AHORA);

    expect(diasDelRango(rango)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });
});

describe("rangoAnterior", () => {
  it("es el período inmediatamente anterior, de igual duración en días de La Paz", () => {
    const rango = resolverRango({ desde: "2026-10-01", hasta: "2026-10-07" }, AHORA); // 7 días

    const anterior = rangoAnterior(rango);

    expect(diasDelRango(anterior)).toEqual(["2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"]);
  });

  it("termina el día previo a desde a las 23:59:59.999 de La Paz y empieza a las 00:00 de La Paz", () => {
    const anterior = rangoAnterior(resolverRango({ desde: "2026-10-01", hasta: "2026-10-01" }, AHORA));

    // Un solo día: el anterior es el 30 de septiembre completo. La Paz es UTC-4.
    expect(anterior.desde.toISOString()).toBe("2026-09-30T04:00:00.000Z");
    expect(anterior.hasta.toISOString()).toBe("2026-10-01T03:59:59.999Z");
  });

  it("cruza el cambio de mes y de año sin perder ni repetir días", () => {
    const anterior = rangoAnterior(resolverRango({ desde: "2026-01-03", hasta: "2026-01-05" }, AHORA)); // 3 días

    expect(diasDelRango(anterior)).toEqual(["2025-12-31", "2026-01-01", "2026-01-02"]);
  });

  it("con el período por defecto (30 días) también son 30 días", () => {
    expect(diasDelRango(rangoAnterior(resolverRango(undefined, AHORA)))).toHaveLength(30);
  });
});
