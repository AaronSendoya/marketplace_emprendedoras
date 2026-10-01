import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { normalizarOtraRedSocial } from "./OtraRedSocial";

describe("normalizarOtraRedSocial", () => {
  it.each([undefined, null, "", "   "])("sin texto (%j) devuelve null", (entrada) => {
    expect(normalizarOtraRedSocial(entrada)).toBeNull();
  });

  it("recorta los espacios y respeta el resto tal cual", () => {
    expect(normalizarOtraRedSocial("  @Mi.Tienda_TikTok ")).toBe("@Mi.Tienda_TikTok");
  });

  it("acepta 50 caracteres y rechaza 51", () => {
    expect(normalizarOtraRedSocial("a".repeat(50))).toHaveLength(50);
    expect(() => normalizarOtraRedSocial("a".repeat(51))).toThrow(ErrorValidacion);
  });
});
