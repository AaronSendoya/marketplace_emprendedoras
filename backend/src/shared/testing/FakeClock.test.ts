import { describe, expect, it } from "vitest";
import { SystemClock } from "@/shared/infrastructure/SystemClock";
import { FakeClock } from "./FakeClock";

describe("FakeClock", () => {
  it("devuelve la hora fijada y permite avanzarla", () => {
    const reloj = new FakeClock(new Date("2026-12-31T23:59:59-04:00"));

    reloj.avanzar(1000);

    expect(reloj.ahora().toISOString()).toBe("2027-01-01T04:00:00.000Z");
  });

  it("entrega copias: modificar la fecha devuelta no altera el reloj", () => {
    const reloj = new FakeClock(new Date(0));

    reloj.ahora().setFullYear(2100);

    expect(reloj.ahora().getTime()).toBe(0);
  });

  it("fijar reemplaza la hora", () => {
    const reloj = new FakeClock(new Date(0));

    reloj.fijar(new Date("2026-12-01T00:00:00-04:00"));

    expect(reloj.ahora().toISOString()).toBe("2026-12-01T04:00:00.000Z");
  });
});

describe("SystemClock", () => {
  it("devuelve la hora actual", () => {
    expect(Math.abs(new SystemClock().ahora().getTime() - Date.now())).toBeLessThan(1000);
  });
});
