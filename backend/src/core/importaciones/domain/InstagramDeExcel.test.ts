import { describe, expect, it } from "vitest";
import { clasificarInstagram, clasificarOtraRed } from "./InstagramDeExcel";

describe("clasificarInstagram (regla 22 + regla 3)", () => {
  it("vacío es vacío", () => {
    expect(clasificarInstagram("")).toEqual({ tipo: "vacio" });
    expect(clasificarInstagram("   ")).toEqual({ tipo: "vacio" });
  });

  it.each([
    ["@farmaciacareaga", "farmaciacareaga"],
    ["@quimera.almadefuego", "quimera.almadefuego"],
    ["https://www.instagram.com/escarlem_manualidades/", "escarlem_manualidades"],
    ["https://www.instagram.com/tierra.y.trama?igshid=abc123", "tierra.y.trama"],
    ["instagram.com/hogarcreativo", "hogarcreativo"],
    ["Leidy", "leidy"],
    ["Cat.Llejera", "cat.llejera"],
  ])("«%s» es el usuario de Instagram «%s»", (texto, usuario) => {
    expect(clasificarInstagram(texto)).toEqual({ tipo: "instagram", usuario });
  });

  it.each(["No tengo", "no cuento con instagram", "Nose tiene aun instagram", "No", "ninguno", "Sin instagram", "aun no tengo", "N/A"])(
    "«%s» quiere decir que no tiene Instagram",
    (texto) => {
      expect(clasificarInstagram(texto).tipo).toBe("sin_instagram");
    },
  );

  it("un usuario que empieza con «no» pero no es una frase sigue siendo un usuario (nomada_store)", () => {
    expect(clasificarInstagram("nomada_store")).toEqual({ tipo: "instagram", usuario: "nomada_store" });
  });

  it("un enlace de Facebook, una página web o cualquier enlace va a «otra red social»", () => {
    expect(clasificarInstagram("https://www.facebook.com/NativaBolivia")).toEqual({ tipo: "otra_red", texto: "https://www.facebook.com/NativaBolivia" });
    expect(clasificarInstagram("Tapados.com.bo")).toEqual({ tipo: "otra_red", texto: "Tapados.com.bo" });
    expect(clasificarInstagram("www.mitienda.bo")).toEqual({ tipo: "otra_red", texto: "www.mitienda.bo" });
  });

  it("un enlace de más de 50 caracteres no cabe en «otra red social»", () => {
    const enlace = `https://www.facebook.com/${"a".repeat(60)}`;

    expect(clasificarInstagram(enlace)).toEqual({ tipo: "otra_red_larga", texto: enlace });
  });

  it("un texto con espacios que no es una frase de «no tengo» no se reconoce (se deja vacío y se avisa)", () => {
    expect(clasificarInstagram("Nutrimentos maybo")).toEqual({ tipo: "irreconocible", texto: "Nutrimentos maybo" });
  });

  it("un enlace de Instagram que no es un perfil (una publicación) no se reconoce", () => {
    expect(clasificarInstagram("https://www.instagram.com/p/Cxyz123/").tipo).toBe("irreconocible");
  });

  it("un usuario inválido por largo o por símbolos no se reconoce", () => {
    expect(clasificarInstagram("a".repeat(31)).tipo).toBe("irreconocible");
    expect(clasificarInstagram("mi tienda!!").tipo).toBe("irreconocible");
  });
});

describe("clasificarOtraRed (regla 22 + regla 3)", () => {
  it("vacío es vacío", () => {
    expect(clasificarOtraRed("")).toEqual({ tipo: "vacio" });
    expect(clasificarOtraRed("   ")).toEqual({ tipo: "vacio" });
  });

  it.each(["No tengo", "no", "Ninguna", "n/a", "-", "Aún no tiene", "sin redes"])("«%s» es no tener otra red", (texto) => {
    expect(clasificarOtraRed(texto)).toEqual({ tipo: "sin_red" });
  });

  it("es texto libre: no adivina de qué red es, solo lo recorta y junta los espacios", () => {
    expect(clasificarOtraRed("  TikTok:   @dulcesdeana ")).toEqual({ tipo: "texto", texto: "TikTok: @dulcesdeana" });
    expect(clasificarOtraRed("https://www.facebook.com/Nativa")).toEqual({ tipo: "texto", texto: "https://www.facebook.com/Nativa" });
    expect(clasificarOtraRed("@dulcesdeana")).toEqual({ tipo: "texto", texto: "@dulcesdeana" });
  });

  it("50 caracteres caben y 51 no", () => {
    expect(clasificarOtraRed("a".repeat(50))).toEqual({ tipo: "texto", texto: "a".repeat(50) });
    expect(clasificarOtraRed("a".repeat(51))).toEqual({ tipo: "texto_largo", texto: "a".repeat(51) });
  });
});
