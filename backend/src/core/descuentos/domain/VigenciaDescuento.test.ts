import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { crearVigencia, estadoDescuento, interpretarFecha, validarRango } from "./VigenciaDescuento";

const utc = (texto: string) => new Date(texto);

describe("interpretarFecha (regla 8)", () => {
  describe("solo fecha: día completo en La Paz (UTC-4)", () => {
    it("el inicio es a las 00:00:00 de La Paz", () => {
      expect(interpretarFecha("2026-12-01", "inicio")).toEqual(utc("2026-12-01T04:00:00.000Z"));
    });

    it("el fin es a las 23:59:59 de La Paz, así que el último día cuenta completo", () => {
      expect(interpretarFecha("2026-12-31", "fin")).toEqual(utc("2027-01-01T03:59:59.000Z"));
    });

    it("el 29 de febrero solo existe en año bisiesto", () => {
      expect(interpretarFecha("2028-02-29", "inicio")).toEqual(utc("2028-02-29T04:00:00.000Z"));
      expect(() => interpretarFecha("2026-02-29", "inicio")).toThrow(ErrorValidacion);
    });
  });

  describe("fecha y hora sin zona: se interpretan como hora de La Paz", () => {
    it("YYYY-MM-DDTHH:mm", () => {
      expect(interpretarFecha("2026-12-01T09:30", "inicio")).toEqual(utc("2026-12-01T13:30:00.000Z"));
    });

    it("con segundos", () => {
      expect(interpretarFecha("2026-12-01T20:15:45", "fin")).toEqual(utc("2026-12-02T00:15:45.000Z"));
    });

    it("no completa la hora por extremo: la que se escribe es la que vale", () => {
      expect(interpretarFecha("2026-12-31T00:00", "fin")).toEqual(utc("2026-12-31T04:00:00.000Z"));
    });
  });

  describe("con zona: se respeta", () => {
    it.each([
      ["Z", "2026-12-01T10:00:00Z", "2026-12-01T10:00:00.000Z"],
      ["desfase negativo", "2026-12-01T10:00:00-04:00", "2026-12-01T14:00:00.000Z"],
      ["desfase positivo", "2026-12-01T10:00:00+02:00", "2026-12-01T08:00:00.000Z"],
      ["sin segundos", "2026-12-01T10:00Z", "2026-12-01T10:00:00.000Z"],
      ["con milisegundos", "2026-12-01T10:00:00.500Z", "2026-12-01T10:00:00.500Z"],
    ])("%s", (_caso, entrada, esperado) => {
      expect(interpretarFecha(entrada, "inicio")).toEqual(utc(esperado));
    });
  });

  it("acepta espacios alrededor", () => {
    expect(interpretarFecha("  2026-12-01  ", "inicio")).toEqual(utc("2026-12-01T04:00:00.000Z"));
  });

  it.each([
    ["texto libre", "mañana"],
    ["formato dd/mm/aaaa", "01/12/2026"],
    ["mes 13", "2026-13-01"],
    ["día 32", "2026-01-32"],
    ["30 de febrero", "2026-02-30"],
    ["30 de febrero con zona", "2026-02-30T10:00:00Z"],
    ["hora 24", "2026-12-01T24:00"],
    ["minuto 60", "2026-12-01T10:60"],
    ["segundo 60", "2026-12-01T10:00:60"],
    ["sin fecha", "T10:00"],
    ["fecha con hora pero sin la T", "2026-12-01 10:00"],
    ["desfase mal formado", "2026-12-01T10:00:00+2"],
    ["vacío", ""],
  ])("rechaza %s", (_caso, entrada) => {
    expect(() => interpretarFecha(entrada, "inicio")).toThrow(ErrorValidacion);
  });

  it("señala fecha_inicio o fecha_fin según el extremo", () => {
    expect(() => interpretarFecha("mal", "inicio")).toThrow(expect.objectContaining({ detalles: [expect.objectContaining({ campo: "fecha_inicio" })] }));
    expect(() => interpretarFecha("mal", "fin")).toThrow(expect.objectContaining({ detalles: [expect.objectContaining({ campo: "fecha_fin" })] }));
  });
});

describe("crearVigencia y validarRango", () => {
  it("sin fechas: rige desde que se crea y es permanente", () => {
    expect(crearVigencia({})).toEqual({ inicio: null, fin: null });
    expect(crearVigencia({ fechaInicio: null, fechaFin: null })).toEqual({ inicio: null, fin: null });
  });

  it("las fechas son independientes: solo inicio o solo fin", () => {
    expect(crearVigencia({ fechaInicio: "2026-12-01" })).toEqual({ inicio: utc("2026-12-01T04:00:00.000Z"), fin: null });
    expect(crearVigencia({ fechaFin: "2026-12-31" })).toEqual({ inicio: null, fin: utc("2027-01-01T03:59:59.000Z") });
  });

  it("el descuento navideño: del 1 al 31 de diciembre", () => {
    expect(crearVigencia({ fechaInicio: "2026-12-01", fechaFin: "2026-12-31" })).toEqual({
      inicio: utc("2026-12-01T04:00:00.000Z"),
      fin: utc("2027-01-01T03:59:59.000Z"),
    });
  });

  it("un solo día (mismo día en ambos extremos) es válido: dura todo el día", () => {
    expect(() => crearVigencia({ fechaInicio: "2026-12-25", fechaFin: "2026-12-25" })).not.toThrow();
  });

  it("fecha_fin anterior o igual a fecha_inicio da error, señalando fecha_fin", () => {
    expect(() => crearVigencia({ fechaInicio: "2026-12-31", fechaFin: "2026-12-01" })).toThrow(
      expect.objectContaining({ detalles: [expect.objectContaining({ campo: "fecha_fin" })] }),
    );
    expect(() => crearVigencia({ fechaInicio: "2026-12-01T10:00", fechaFin: "2026-12-01T10:00" })).toThrow(ErrorValidacion);
  });

  it("validarRango solo mira el rango cuando existen ambas", () => {
    expect(() => validarRango({ inicio: null, fin: utc("2020-01-01T00:00:00Z") })).not.toThrow();
    expect(() => validarRango({ inicio: utc("2030-01-01T00:00:00Z"), fin: null })).not.toThrow();
  });
});

describe("estadoDescuento", () => {
  const vigencia = crearVigencia({ fechaInicio: "2026-12-01", fechaFin: "2026-12-31" });
  const estado = (ahora: string) => estadoDescuento(vigencia, utc(ahora));

  it("programado hasta que llega el inicio; vigente desde el instante exacto de inicio", () => {
    expect(estado("2026-12-01T03:59:59.999Z")).toBe("programado");
    expect(estado("2026-12-01T04:00:00.000Z")).toBe("vigente");
  });

  it("hoy (septiembre) el descuento navideño figura como programado", () => {
    expect(estado("2026-09-23T12:00:00Z")).toBe("programado");
  });

  it("el último día cuenta completo: 23:59:59 de La Paz sigue vigente y un segundo después está vencido", () => {
    expect(estado("2026-12-31T20:00:00Z")).toBe("vigente"); // 16:00 en La Paz
    expect(estado("2027-01-01T03:59:59.000Z")).toBe("vigente"); // 23:59:59 en La Paz
    expect(estado("2027-01-01T04:00:00.000Z")).toBe("vencido"); // 00:00:00 del día siguiente
  });

  it("sin fechas siempre está vigente", () => {
    expect(estadoDescuento({ inicio: null, fin: null }, utc("2099-01-01T00:00:00Z"))).toBe("vigente");
  });

  it("solo con inicio pasado: vigente para siempre; solo con fin futuro: vigente desde ya", () => {
    expect(estadoDescuento({ inicio: utc("2020-01-01T00:00:00Z"), fin: null }, utc("2026-09-23T00:00:00Z"))).toBe("vigente");
    expect(estadoDescuento({ inicio: null, fin: utc("2030-01-01T00:00:00Z") }, utc("2026-09-23T00:00:00Z"))).toBe("vigente");
  });

  it("solo con fin pasado: vencido", () => {
    expect(estadoDescuento({ inicio: null, fin: utc("2026-01-01T00:00:00Z") }, utc("2026-09-23T00:00:00Z"))).toBe("vencido");
  });
});
