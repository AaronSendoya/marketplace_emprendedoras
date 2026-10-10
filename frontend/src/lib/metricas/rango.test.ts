import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DIAS_MAXIMOS_PERIODO, esFechaReal, etiquetaRangoCorto, hoyLaPaz, periodoValido, resolverRangoConAnterior } from "./rango.ts";

describe("esFechaReal", () => {
  it("acepta fechas que existen, también el 29 de febrero de un año bisiesto", () => {
    assert.equal(esFechaReal("2026-10-09"), true);
    assert.equal(esFechaReal("2028-02-29"), true);
  });

  it("rechaza fechas que pasan por un patrón de dígitos pero no existen", () => {
    assert.equal(esFechaReal("2026-02-30"), false);
    assert.equal(esFechaReal("2027-02-29"), false);
    assert.equal(esFechaReal("2026-13-01"), false);
    assert.equal(esFechaReal("2026-00-10"), false);
    assert.equal(esFechaReal("2026-04-31"), false);
  });

  it("rechaza lo que no tiene el formato YYYY-MM-DD", () => {
    for (const texto of ["", "abc", "2026-1-5", "26-10-09", "2026/10/09", "2026-10-09T00:00", " 2026-10-09", undefined]) {
      assert.equal(esFechaReal(texto), false, String(texto));
    }
  });
});

describe("periodoValido", () => {
  it("acepta un solo día y un período normal", () => {
    assert.equal(periodoValido("2026-10-09", "2026-10-09"), true);
    assert.equal(periodoValido("2026-09-10", "2026-10-09"), true);
  });

  it("rechaza «hasta» anterior a «desde»", () => {
    assert.equal(periodoValido("2026-10-09", "2026-10-01"), false);
  });

  it("acepta hasta 2 años (732 días con los dos extremos) y rechaza un día más: el mismo límite que el backend", () => {
    assert.equal(DIAS_MAXIMOS_PERIODO, 732);
    // 2025-01-01 a 2026-12-31 son 730 días; 2024-12-31 a 2026-12-31, 731; un año bisiesto de por medio no cambia la cuenta.
    assert.equal(periodoValido("2025-01-01", "2026-12-31"), true);
    assert.equal(periodoValido("2025-01-01", "2027-01-01"), true, "731 días");
    assert.equal(periodoValido("2025-01-01", "2027-01-02"), true, "732 días, el máximo");
    assert.equal(periodoValido("2025-01-01", "2027-01-03"), false, "733 días");
    assert.equal(periodoValido("2020-01-01", "2026-10-09"), false);
  });

  it("rechaza fechas que no existen", () => {
    assert.equal(periodoValido("2026-02-30", "2026-03-01"), false);
    assert.equal(periodoValido("2026-03-01", "2026-03-32"), false);
  });
});

describe("resolverRangoConAnterior", () => {
  it("sin parámetros: los últimos 30 días hasta hoy, y el período anterior de igual duración justo antes", () => {
    const hoy = hoyLaPaz();
    const { actual, anterior } = resolverRangoConAnterior();
    assert.equal(actual.hasta, hoy);
    assert.equal(anterior.hasta < actual.desde, true);
    const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
    assert.equal(dias(actual.desde, actual.hasta), 30);
    assert.equal(dias(anterior.desde, anterior.hasta), 30);
    assert.equal(dias(anterior.hasta, actual.desde), 2, "contiguos: el anterior termina el día previo");
  });

  it("respeta un período válido y calcula el anterior con su misma duración", () => {
    const { actual, anterior } = resolverRangoConAnterior("2026-10-01", "2026-10-07");
    assert.deepEqual(actual, { desde: "2026-10-01", hasta: "2026-10-07" });
    assert.deepEqual(anterior, { desde: "2026-09-24", hasta: "2026-09-30" });
  });

  it("un solo día tiene como anterior el día previo", () => {
    const { actual, anterior } = resolverRangoConAnterior("2026-10-09", "2026-10-09");
    assert.deepEqual(actual, { desde: "2026-10-09", hasta: "2026-10-09" });
    assert.deepEqual(anterior, { desde: "2026-10-08", hasta: "2026-10-08" });
  });

  it("cruza un cambio de año y un 29 de febrero sin perder días", () => {
    const { anterior } = resolverRangoConAnterior("2028-03-01", "2028-03-10");
    assert.deepEqual(anterior, { desde: "2028-02-20", hasta: "2028-02-29" });
    const cruce = resolverRangoConAnterior("2027-01-01", "2027-01-05");
    assert.deepEqual(cruce.anterior, { desde: "2026-12-27", hasta: "2026-12-31" });
  });

  it("con solo «desde» el período llega hasta hoy", () => {
    const { actual } = resolverRangoConAnterior("2026-10-01", undefined);
    assert.equal(actual.desde, "2026-10-01");
    assert.equal(actual.hasta, hoyLaPaz());
  });

  it("un período que el backend rechazaría vuelve al de por defecto en vez de pedirlo (antes daba la pantalla de error)", () => {
    const porDefecto = resolverRangoConAnterior();
    for (const [desde, hasta] of [
      ["2026-10-09", "2026-10-01"],
      ["2020-01-01", "2026-10-09"],
    ] as const) {
      assert.deepEqual(resolverRangoConAnterior(desde, hasta), porDefecto, `${desde} a ${hasta}`);
    }
  });

  it("una fecha que no existe se trata como si faltara, igual que un texto cualquiera", () => {
    // «Desde» inexistente: queda solo «hasta», y el período son los 30 días que terminan ahí.
    const soloHasta = resolverRangoConAnterior("2026-02-30", "2026-03-01");
    assert.deepEqual(soloHasta.actual, { desde: "2026-01-31", hasta: "2026-03-01" });
    assert.deepEqual(resolverRangoConAnterior("abc", "2026-03-01"), soloHasta);
    // «Hasta» inexistente: el período llega hasta hoy.
    const soloDesde = resolverRangoConAnterior("2026-10-01", "2026-03-32");
    assert.deepEqual(soloDesde.actual, { desde: "2026-10-01", hasta: hoyLaPaz() });
    // Las dos inexistentes: el de por defecto.
    assert.deepEqual(resolverRangoConAnterior("2026-02-30", "2026-13-01"), resolverRangoConAnterior());
  });

  it("el período anterior de uno de 2 años sigue siendo uno que el backend acepta", () => {
    const { actual, anterior } = resolverRangoConAnterior("2025-01-01", "2027-01-02");
    assert.equal(periodoValido(actual.desde, actual.hasta), true);
    assert.equal(periodoValido(anterior.desde, anterior.hasta), true);
  });
});

describe("etiquetaRangoCorto", () => {
  it("un período dentro de un año lleva el año solo al final", () => {
    assert.equal(etiquetaRangoCorto("2026-09-10", "2026-10-09"), "10 sep – 9 oct 2026");
  });

  it("un solo día", () => {
    assert.equal(etiquetaRangoCorto("2026-10-09", "2026-10-09"), "9 oct 2026");
  });

  it("si cruza un cambio de año, lo muestra en los dos extremos", () => {
    assert.equal(etiquetaRangoCorto("2025-12-20", "2026-01-10"), "20 dic 2025 – 10 ene 2026");
  });
});
