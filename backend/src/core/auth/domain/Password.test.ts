import { describe, expect, it } from "vitest";
import { cumplePoliticaPassword } from "./Password";

describe("cumplePoliticaPassword (regla 15)", () => {
  it.each([
    ["8 caracteres", "abcd1234", true],
    ["72 bytes exactos", "a".repeat(72), true],
    ["7 caracteres", "abcd123", false],
    ["73 bytes", "a".repeat(73), false],
    ["menos de 72 caracteres pero más de 72 bytes (tildes)", "á".repeat(40), false],
    ["36 tildes = 72 bytes", "á".repeat(36), true],
    ["vacía", "", false],
  ])("%s", (_caso, password, esperado) => {
    expect(cumplePoliticaPassword(password)).toBe(esperado);
  });
});
