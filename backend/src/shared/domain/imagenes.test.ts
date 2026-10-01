import { describe, expect, it } from "vitest";
import {
  CLAVE_FOTO_PERFIL_PREDETERMINADA,
  CLAVE_LOGO_PREDETERMINADO,
  esImagenPredeterminada,
  nuevaClaveImagen,
} from "./imagenes";

describe("imágenes (reglas 11 y 16)", () => {
  it("las claves nuevas son únicas, .webp y separadas por tipo", () => {
    const perfil = nuevaClaveImagen("perfil");

    expect(perfil).toMatch(/^perfiles\/[0-9a-f-]{36}\.webp$/);
    expect(nuevaClaveImagen("logo")).toMatch(/^logos\//);
    expect(nuevaClaveImagen("producto")).toMatch(/^productos\//);
    expect(nuevaClaveImagen("perfil")).not.toBe(perfil);
  });

  it("solo las claves de defaults/ son predeterminadas (nunca se borran)", () => {
    expect(esImagenPredeterminada(CLAVE_FOTO_PERFIL_PREDETERMINADA)).toBe(true);
    expect(esImagenPredeterminada(CLAVE_LOGO_PREDETERMINADO)).toBe(true);
    expect(esImagenPredeterminada(nuevaClaveImagen("perfil"))).toBe(false);
  });
});
