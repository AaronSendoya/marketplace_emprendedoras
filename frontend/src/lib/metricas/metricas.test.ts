import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FilaMapaCalor } from "../api/tipos.ts";
import { cambioEnPuntos, formatearPuntos, participacionPorCanal } from "./canales.ts";
import { calcularCuota, formatearEntero, nivelCalor, serieDeFila } from "./mapaCalor.ts";
import { mesesParaMovimiento } from "./mes.ts";
import { calcularMovimiento } from "./movimiento.ts";
import { calcularTendencia } from "./tendencia.ts";

function fila(perfil_id: string, nombre_negocio: string, total: number): FilaMapaCalor {
  return { perfil_id, nombre_negocio, whatsapp: total, instagram: 0, total, total_anterior: 0, celdas: [] } as unknown as FilaMapaCalor;
}

describe("calcularTendencia", () => {
  it("sin clics en el período anterior no hay con qué comparar (null, no un +100 % inventado)", () => {
    assert.equal(calcularTendencia(10, 0), null);
    assert.equal(calcularTendencia(0, 0), null);
  });

  it("sube, baja y se queda igual", () => {
    assert.equal(calcularTendencia(15, 10), 50);
    assert.equal(calcularTendencia(5, 10), -50);
    assert.equal(calcularTendencia(10, 10), 0);
    assert.equal(calcularTendencia(0, 10), -100);
  });
});

describe("participacionPorCanal y cambioEnPuntos", () => {
  it("reparte el total entre los dos canales", () => {
    const p = participacionPorCanal({ whatsapp: 24, instagram: 25 });
    assert.equal(p.total, 49);
    assert.ok(Math.abs((p.whatsapp ?? 0) + (p.instagram ?? 0) - 100) < 1e-9);
  });

  it("sin clics no hay porcentaje", () => {
    assert.deepEqual(participacionPorCanal({ whatsapp: 0, instagram: 0 }), { total: 0, whatsapp: null, instagram: null });
  });

  it("el cambio en puntos se calcula con las participaciones sin redondear y con un decimal", () => {
    assert.equal(cambioEnPuntos(60, 50), 10);
    assert.equal(cambioEnPuntos(50.04, 50), 0);
    assert.equal(cambioEnPuntos(null, 50), null);
    assert.equal(cambioEnPuntos(50, null), null);
  });

  it("formatea con coma decimal y un decimal como máximo", () => {
    assert.equal(formatearPuntos(12.34), "12,3");
    assert.equal(formatearPuntos(-3), "-3");
  });
});

describe("mapa de calor", () => {
  it("el nivel mide el valor frente al líder con umbrales fijos; 0 es «sin clics», distinto de «bajo»", () => {
    assert.equal(nivelCalor(0, 10), 0);
    assert.equal(nivelCalor(5, 0), 0);
    assert.equal(nivelCalor(1, 10), 1);
    assert.equal(nivelCalor(2.5, 10), 2);
    assert.equal(nivelCalor(5, 10), 3);
    assert.equal(nivelCalor(7.5, 10), 4);
    assert.equal(nivelCalor(10, 10), 4);
  });

  it("la evolución de una fila suma los dos canales de cada columna", () => {
    assert.deepEqual(serieDeFila([{ whatsapp: 1, instagram: 2 }, { whatsapp: 0, instagram: 0 }, { whatsapp: 4, instagram: 1 }]), [3, 0, 5]);
  });

  it("la cuota no existe cuando no hubo clics", () => {
    assert.equal(calcularCuota(5, 0), null);
    assert.equal(calcularCuota(1, 4), 25);
  });

  it("los enteros de cuatro cifras van sin separador y desde cinco con punto", () => {
    assert.equal(formatearEntero(999), "999");
    assert.equal(formatearEntero(1041), "1041");
    assert.equal(formatearEntero(10412), "10.412");
    assert.equal(formatearEntero(1234567), "1.234.567");
    assert.equal(formatearEntero(0), "0");
  });
});

describe("mesesParaMovimiento", () => {
  it("el 9 de octubre compara septiembre con agosto, meses completos", () => {
    const { mes, anterior } = mesesParaMovimiento("2026-10-09");
    assert.deepEqual([mes.desde, mes.hasta, mes.etiqueta], ["2026-09-01", "2026-09-30", "septiembre de 2026"]);
    assert.deepEqual([anterior.desde, anterior.hasta, anterior.etiqueta], ["2026-08-01", "2026-08-31", "agosto de 2026"]);
  });

  it("en enero retrocede al año anterior", () => {
    const { mes, anterior } = mesesParaMovimiento("2027-01-15");
    assert.deepEqual([mes.desde, mes.hasta], ["2026-12-01", "2026-12-31"]);
    assert.deepEqual([anterior.desde, anterior.hasta], ["2026-11-01", "2026-11-30"]);
    const marzo = mesesParaMovimiento("2027-03-02");
    assert.deepEqual([marzo.mes.hasta, marzo.anterior.hasta], ["2027-02-28", "2027-01-31"]);
  });

  it("febrero bisiesto tiene 29 días", () => {
    assert.equal(mesesParaMovimiento("2028-03-05").mes.hasta, "2028-02-29");
  });
});

describe("calcularMovimiento", () => {
  it("ordena por clics ganados o perdidos, no por porcentaje (3 a 6 clics es +100 %, 44 a 59 es +34 %)", () => {
    const mes = [fila("a", "Ana", 6), fila("b", "Beto", 59)];
    const anterior = [fila("a", "Ana", 3), fila("b", "Beto", 44)];
    const { suben, bajan } = calcularMovimiento(mes, anterior);
    assert.deepEqual(suben.map((c) => [c.nombre_negocio, c.diferencia, c.porcentaje]), [["Beto", 15, 34], ["Ana", 3, 100]]);
    assert.deepEqual(bajan, []);
  });

  it("una cuenta sin clics el mes anterior sube sin porcentaje (no hay base contra cero)", () => {
    const { suben } = calcularMovimiento([fila("a", "Ana", 4)], [fila("z", "Zoe", 9)]);
    assert.deepEqual(suben.map((c) => [c.nombre_negocio, c.diferencia, c.porcentaje]), [["Ana", 4, null]]);
  });

  it("una cuenta que dejó de aparecer en una lista que no llegó al límite perdió todos sus clics", () => {
    const { bajan } = calcularMovimiento([fila("a", "Ana", 1)], [fila("a", "Ana", 1), fila("z", "Zoe", 9)]);
    assert.deepEqual(bajan.map((c) => [c.nombre_negocio, c.diferencia, c.porcentaje]), [["Zoe", -9, -100]]);
  });

  it("si una lista llegó al límite, la cuenta ausente podría estar fuera del top: no se compara", () => {
    const llena = Array.from({ length: 20 }, (_, i) => fila(`p${i}`, `Negocio ${i}`, 100 - i));
    const { suben, bajan } = calcularMovimiento(llena, [fila("p0", "Negocio 0", 100), fila("fuera", "Fuera", 5)], 3, 20);
    assert.ok(!suben.some((c) => c.perfil_id === "fuera") && !bajan.some((c) => c.perfil_id === "fuera"));
    assert.ok(suben.every((c) => c.perfil_id !== "p0"), "sin cambio no figura");
  });

  it("los empates se desempatan por nombre y cada lista se corta en 3", () => {
    const mes = ["Delta", "Alfa", "Charlie", "Bravo"].map((n, i) => fila(`m${i}`, n, 5));
    const { suben } = calcularMovimiento(mes, []);
    assert.deepEqual(suben.map((c) => c.nombre_negocio), ["Alfa", "Bravo", "Charlie"]);
  });
});
