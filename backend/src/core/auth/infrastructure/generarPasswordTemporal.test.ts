import { describe, expect, it } from "vitest";
import { cumplePoliticaPassword } from "../domain/Password";
import { generarPasswordTemporal } from "./generarPasswordTemporal";

describe("generarPasswordTemporal", () => {
  it("son 12 caracteres sin los que se confunden al dictarlos (0, O, 1, l, I) y cumplen la política", () => {
    for (let i = 0; i < 500; i++) {
      const password = generarPasswordTemporal();

      expect(password).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
      expect(cumplePoliticaPassword(password)).toBe(true);
    }
  });

  it("no se repite", () => {
    expect(new Set(Array.from({ length: 100 }, generarPasswordTemporal)).size).toBe(100);
  });
});
