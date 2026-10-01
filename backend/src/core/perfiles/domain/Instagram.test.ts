import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { normalizarInstagram } from "./Instagram";

describe("normalizarInstagram (regla 3)", () => {
  it.each([
    ["@usuario", "usuario"],
    ["usuario", "usuario"],
    ["  @usuario  ", "usuario"],
    ["instagram.com/usuario", "usuario"],
    ["https://instagram.com/usuario", "usuario"],
    ["http://www.instagram.com/usuario/", "usuario"],
    ["https://instagram.com/usuario?igsh=abc123", "usuario"],
    ["https://www.instagram.com/usuario/?hl=es#x", "usuario"],
    ["https://m.instagram.com/usuario/reels/", "usuario"],
    ["instagram.com/@usuario", "usuario"],
    ["@Mi.Tienda_01", "mi.tienda_01"],
    ["MiTienda", "mitienda"],
  ])("%s -> %s", (entrada, esperado) => {
    expect(normalizarInstagram(entrada)).toBe(esperado);
  });

  it.each([undefined, null, "", "   "])("sin texto (%j) devuelve null: el Instagram es opcional", (entrada) => {
    expect(normalizarInstagram(entrada)).toBeNull();
  });

  it.each([
    ["enlace a una publicación", "https://instagram.com/p/Cabc123/"],
    ["enlace a un reel", "https://www.instagram.com/reel/Cabc123/"],
    ["enlace a explorar", "instagram.com/explore/tags/moda"],
    ["enlace sin usuario", "https://instagram.com/"],
    ["otro sitio con instagram.com en el texto", "https://evil.com/instagram.com/usuario"],
    ["espacios en el usuario", "mi tienda"],
    ["caracteres no permitidos", "@mi-tienda"],
    ["más de 30 caracteres", "a".repeat(31)],
    ["puntos seguidos", "mi..tienda"],
    ["termina en punto", "mitienda."],
    ["una barra en un texto sin enlace", "mi/tienda"],
    ["solo la arroba", "@"],
  ])("rechaza %s", (_caso, entrada) => {
    expect(() => normalizarInstagram(entrada)).toThrow(ErrorValidacion);
  });

  it("acepta 30 caracteres justos", () => {
    expect(normalizarInstagram("a".repeat(30))).toBe("a".repeat(30));
  });
});
