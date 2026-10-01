import { describe, expect, it } from "vitest";
import { DIGITOS_CODIGO_OTP } from "../domain/Otp";
import { generarCodigoOtp } from "./generarCodigoOtp";

describe("generarCodigoOtp", () => {
  it(`siempre devuelve ${DIGITOS_CODIGO_OTP} dígitos, con ceros a la izquierda si hace falta`, () => {
    for (let i = 0; i < 2000; i++) {
      expect(generarCodigoOtp()).toMatch(new RegExp(`^\\d{${DIGITOS_CODIGO_OTP}}$`));
    }
  });

  it("no repite el mismo código siempre", () => {
    expect(new Set(Array.from({ length: 50 }, generarCodigoOtp)).size).toBeGreaterThan(40);
  });
});
