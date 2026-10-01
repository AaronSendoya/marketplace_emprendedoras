import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { normalizarWhatsapp } from "./Whatsapp";

describe("normalizarWhatsapp (regla 2)", () => {
  it.each([
    ["8 dígitos bolivianos que empiezan con 7", "71234567", "59171234567"],
    ["8 dígitos bolivianos que empiezan con 6", "61234567", "59161234567"],
    ["con espacios", "7123 4567", "59171234567"],
    ["con guiones", "712-34-567", "59171234567"],
    ["con paréntesis y puntos", "(7) 123.4567", "59171234567"],
    ["con +591 y espacios", "+591 71234567", "59171234567"],
    ["con +591 y guiones", "+591-712-34567", "59171234567"],
    ["con 00591", "00591 71234567", "59171234567"],
    ["ya con 591 sin +", "59171234567", "59171234567"],
    ["con espacios alrededor", "  71234567  ", "59171234567"],
    ["otro país con +", "+54 9 11 2345-6789", "5491123456789"],
    ["otro país con 00", "0051 987 654 321", "51987654321"],
  ])("%s", (_caso, entrada, esperado) => {
    expect(normalizarWhatsapp(entrada)).toBe(esperado);
  });

  it.each([
    ["letras", "7123abcd"],
    ["vacío", ""],
    ["solo símbolos", "+-()"],
    ["fijo de 7 dígitos (no es celular)", "2123456"],
    ["8 dígitos que no empiezan con 6 ni 7", "51234567"],
    ["número extranjero sin + ni 00 (ambiguo)", "5491123456789"],
    ["+591 con dígitos de más", "+591 712345678"],
    ["+591 que no empieza con 6 o 7", "+591 21234567"],
    ["demasiado corto con +", "+123"],
    ["demasiado largo con +", "+1234567890123456"],
    ["dos signos +", "++59171234567"],
  ])("rechaza %s", (_caso, entrada) => {
    expect(() => normalizarWhatsapp(entrada)).toThrow(ErrorValidacion);
  });

  it("señala el campo whatsapp en el error", () => {
    try {
      normalizarWhatsapp("hola");
    } catch (error) {
      expect((error as ErrorValidacion).detalles?.[0].campo).toBe("whatsapp");
      return;
    }
    throw new Error("no lanzó");
  });
});
