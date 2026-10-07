import { describe, expect, it } from "vitest";
import { ordenarPorSimilitud, type ProductoBuscable } from "./BusquedaSimilar";

const producto = (productoId: string, nombre: string, parches: Partial<ProductoBuscable> = {}): ProductoBuscable => ({
  productoId,
  nombre,
  descripcion: null,
  nombreNegocio: "Negocio sin nada",
  ...parches,
});

const catalogo = [
  producto("torta", "Torta de chocolate", { descripcion: "Bizcocho húmedo con ganache", nombreNegocio: "Dulces de Ana" }),
  producto("chompa", "Chompa de alpaca", { descripcion: "Tejida a mano", nombreNegocio: "Tejidos Andinos" }),
  producto("cafe", "Café molido", { descripcion: "Grano de los Yungas", nombreNegocio: "Café Altura" }),
  producto("jabon", "Jabón de coca", { nombreNegocio: "Jabones Naturales" }),
];

describe("ordenarPorSimilitud de productos (regla 21)", () => {
  const buscar = (texto: string, productos = catalogo) => ordenarPorSimilitud(texto, productos);

  it("encuentra un producto con el nombre mal escrito", () => {
    expect(buscar("tota")).toEqual(["torta"]);
    expect(buscar("chonpa")).toEqual(["chompa"]);
    expect(buscar("jabun")).toEqual(["jabon"]);
  });

  it("encuentra por la descripción y por el nombre del negocio", () => {
    expect(buscar("bizcocho humdo")).toEqual(["torta"]);
    expect(buscar("alpacca")).toEqual(["chompa"]);
    expect(buscar("dulses de ana")).toEqual(["torta"]);
    expect(buscar("tejidos andinoz")).toEqual(["chompa"]);
  });

  it("todas las palabras deben parecerse a algo del producto, en cualquier campo y orden", () => {
    expect(buscar("chocolte dulses")).toEqual(["torta"]);
    expect(buscar("chocolte tejidos")).toEqual([]);
  });

  it("no busca fuera de esos tres textos", () => {
    expect(buscar("zapatos")).toEqual([]);
    expect(buscar("pastel")).toEqual([]);
  });

  it("entre dos productos igual de parecidos va primero el que coincide en el nombre del producto, luego en el del negocio, luego en la descripción", () => {
    const enNombre = producto("nombre", "Dulces surtidos");
    const enNegocio = producto("negocio", "Caja de regalo", { nombreNegocio: "Dulces Zeta" });
    const enDescripcion = producto("descripcion", "Caja grande", { descripcion: "Con dulces variados" });

    expect(buscar("dulces", [enDescripcion, enNegocio, enNombre])).toEqual(["nombre", "negocio", "descripcion"]);
  });

  it("sin productos no hay resultados", () => {
    expect(buscar("torta", [])).toEqual([]);
  });
});
