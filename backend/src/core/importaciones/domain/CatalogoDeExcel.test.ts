import { describe, expect, it } from "vitest";
import { CIUDADES, RUBROS } from "../testing/dobles";
import { resolverCiudad, resolverRubro } from "./CatalogoDeExcel";

describe("resolverCiudad", () => {
  it("encuentra la ciudad por nombre, sin importar tildes, mayúsculas ni espacios", () => {
    expect(resolverCiudad("La Paz", CIUDADES)?.nombre).toBe("La Paz");
    expect(resolverCiudad("  potosi ", CIUDADES)?.nombre).toBe("Potosí");
    expect(resolverCiudad("SANTA   CRUZ", CIUDADES)?.nombre).toBe("Santa Cruz");
  });

  it("una ciudad que no está o un texto vacío no se resuelve", () => {
    expect(resolverCiudad("Riberalta", CIUDADES)).toBeNull();
    expect(resolverCiudad("", CIUDADES)).toBeNull();
    expect(resolverCiudad("   ", CIUDADES)).toBeNull();
  });
});

describe("resolverRubro", () => {
  it.each(RUBROS)("el rubro oficial «$nombre» se resuelve por su nombre", (rubro) => {
    expect(resolverRubro(rubro.nombre, RUBROS)).toEqual(rubro);
  });

  it("no distingue tildes, mayúsculas ni espacios de más", () => {
    expect(resolverRubro("salud y bienestar", RUBROS)?.nombre).toBe("Salud y bienestar");
    expect(resolverRubro("DISEÑO O  CONFECCION", RUBROS)?.nombre).toBe("Diseño o confección");
    expect(resolverRubro("  tecnologia y servicios profesionales ", RUBROS)?.nombre).toBe("Tecnología y servicios profesionales");
  });

  it("un rubro que no está en el catálogo no se resuelve (no se inventa uno ni hay equivalencias)", () => {
    expect(resolverRubro("Astrología", RUBROS)).toBeNull();
    expect(resolverRubro("Moda y accesorios", RUBROS)).toBeNull();
    expect(resolverRubro("Otros", RUBROS)).toBeNull();
    expect(resolverRubro("", RUBROS)).toBeNull();
  });

  it("es un nombre completo, no una parte: «Artesanías» solo no es «Artesanías o productos hechos a mano»", () => {
    expect(resolverRubro("Artesanías", RUBROS)).toBeNull();
  });
});
