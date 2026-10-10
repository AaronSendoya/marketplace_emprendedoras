import { describe, expect, it } from "vitest";
import {
  DIAS_CONSERVAR_INTENTOS_LOGIN,
  DIAS_CONSERVAR_OTP,
  DIAS_CONSERVAR_SESIONES_VENCIDAS,
  type EjecutorBorrado,
  limpiarRegistrosAntiguos,
  TAMANO_LOTE,
} from "./limpieza";

const AHORA = new Date("2026-10-08T12:00:00.000Z");
const DIA = 24 * 60 * 60 * 1000;

// Base falsa: cada tabla tiene una cantidad de filas viejas; cada borrado quita hasta TAMANO_LOTE.
function baseFalsa(viejas: { intentos_login: number; otp_codigos: number; sesiones?: number }) {
  const restantes = { sesiones: 0, ...viejas };
  const llamadas: Array<{ tabla: string; sql: string; valores: unknown[] }> = [];
  const ejecutor: EjecutorBorrado = {
    async borrar(sql, valores) {
      const tabla = /FROM (\w+)/.exec(sql)?.[1] as keyof typeof restantes;
      llamadas.push({ tabla, sql, valores });
      const borradas = Math.min(restantes[tabla], Number(valores[1]));
      restantes[tabla] -= borradas;
      return borradas;
    },
  };
  return { ejecutor, llamadas, restantes };
}

describe("limpiarRegistrosAntiguos", () => {
  it("borra los intentos de acceso de más de 30 días, los códigos OTP de más de 7 y las sesiones vencidas hace más de un día", async () => {
    const { ejecutor, llamadas } = baseFalsa({ intentos_login: 3, otp_codigos: 2, sesiones: 4 });

    const resultado = await limpiarRegistrosAntiguos(ejecutor, AHORA);

    expect(resultado).toEqual({ intentosLogin: 3, otp: 2, sesiones: 4 });
    const sesiones = llamadas.find((l) => l.tabla === "sesiones");
    expect((sesiones?.valores[0] as Date).getTime()).toBe(AHORA.getTime() - DIAS_CONSERVAR_SESIONES_VENCIDAS * DIA);
    expect(DIAS_CONSERVAR_SESIONES_VENCIDAS).toBe(1);
    const intentos = llamadas.find((l) => l.tabla === "intentos_login");
    const otp = llamadas.find((l) => l.tabla === "otp_codigos");
    expect((intentos?.valores[0] as Date).getTime()).toBe(AHORA.getTime() - DIAS_CONSERVAR_INTENTOS_LOGIN * DIA);
    expect((otp?.valores[0] as Date).getTime()).toBe(AHORA.getTime() - DIAS_CONSERVAR_OTP * DIA);
    expect(DIAS_CONSERVAR_INTENTOS_LOGIN).toBe(30);
    expect(DIAS_CONSERVAR_OTP).toBe(7);
  });

  it("borra por lotes hasta vaciar lo viejo, sin pedir de más", async () => {
    const { ejecutor, llamadas, restantes } = baseFalsa({ intentos_login: TAMANO_LOTE * 2 + 17, otp_codigos: TAMANO_LOTE });

    const resultado = await limpiarRegistrosAntiguos(ejecutor, AHORA);

    expect(resultado).toEqual({ intentosLogin: TAMANO_LOTE * 2 + 17, otp: TAMANO_LOTE, sesiones: 0 });
    expect(restantes).toEqual({ intentos_login: 0, otp_codigos: 0, sesiones: 0 });
    expect(llamadas.filter((l) => l.tabla === "intentos_login")).toHaveLength(3);
    // Un lote exactamente lleno obliga a una llamada más para saber que no queda nada.
    expect(llamadas.filter((l) => l.tabla === "otp_codigos")).toHaveLength(2);
    expect(llamadas.every((l) => l.valores[1] === TAMANO_LOTE)).toBe(true);
  });

  it("sin nada viejo no borra nada", async () => {
    const { ejecutor } = baseFalsa({ intentos_login: 0, otp_codigos: 0 });

    expect(await limpiarRegistrosAntiguos(ejecutor, AHORA)).toEqual({ intentosLogin: 0, otp: 0, sesiones: 0 });
  });

  it("solo toca esas tres tablas, con sentencias fijas que reciben la fecha y el lote como parámetros", async () => {
    const { ejecutor, llamadas } = baseFalsa({ intentos_login: 1, otp_codigos: 1, sesiones: 1 });

    await limpiarRegistrosAntiguos(ejecutor, AHORA);

    expect(new Set(llamadas.map((l) => l.sql))).toEqual(
      new Set([
        "DELETE FROM intentos_login WHERE creado_en < ? LIMIT ?",
        "DELETE FROM otp_codigos WHERE creado_en < ? LIMIT ?",
        "DELETE FROM sesiones WHERE expira_en IS NOT NULL AND expira_en < ? LIMIT ?",
      ]),
    );
  });
});
