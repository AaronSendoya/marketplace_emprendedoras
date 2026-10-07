import { describe, expect, it } from "vitest";
import { ordenarPorSimilitud, type PerfilBuscable } from "./BusquedaSimilar";

const perfil = (perfilId: string, parches: Partial<PerfilBuscable> = {}): PerfilBuscable => ({
  perfilId,
  nombreNegocio: "Negocio sin nada",
  nombreEmprendedora: "Persona Cualquiera",
  descripcion: "Texto de relleno",
  productos: [],
  ...parches,
});

const dulces = perfil("dulces", {
  nombreNegocio: "Dulces de prueba",
  nombreEmprendedora: "Aaron Mamani Quispe",
  descripcion: "Descripción de prueba del smoke test",
  productos: [{ nombre: "Macbook pro", descripcion: "Notebook con 16 GB RAM" }],
});
const cafe = perfil("cafe", {
  nombreNegocio: "Café Andino",
  nombreEmprendedora: "María Flores",
  productos: [{ nombre: "Grano tostado", descripcion: "Café de altura de Los Yungas" }],
});
const jabones = perfil("jabones", { nombreNegocio: "Jabones Naturales", nombreEmprendedora: "Lucía Choque" });
const catalogo = [dulces, cafe, jabones];

describe("ordenarPorSimilitud", () => {
  const buscar = (texto: string, perfiles = catalogo) => ordenarPorSimilitud(texto, perfiles);

  it("encuentra una palabra mal escrita del nombre del negocio (`dulses`)", () => {
    expect(buscar("dulses")).toEqual(["dulces"]);
    expect(buscar("DULSES")).toEqual(["dulces"]);
  });

  it("encuentra un nombre de persona mal escrito (`aarun`)", () => {
    expect(buscar("aarun")).toEqual(["dulces"]);
    expect(buscar("maria floress")).toEqual(["cafe"]);
  });

  it("encuentra con una letra de más, de menos o dos intercambiadas", () => {
    expect(buscar("dulcess")).toEqual(["dulces"]);
    expect(buscar("dulcs")).toEqual(["dulces"]);
    expect(buscar("dluces")).toEqual(["dulces"]);
  });

  it("una palabra de 6 letras o más tolera dos errores (`macbok` por `Macbook`, `jabnes` por `jabones`)", () => {
    expect(buscar("macbok")).toEqual(["dulces"]);
    expect(buscar("jabnes")).toEqual(["jabones"]);
    expect(buscar("jabnezz")).toEqual(["jabones"]);
  });

  it("reconoce las confusiones de sonido del español (c/s/z, b/v, h muda, g/j)", () => {
    expect(buscar("abeja", [perfil("a", { nombreNegocio: "Avejas del valle" })])).toEqual(["a"]);
    expect(buscar("ojas", [perfil("a", { nombreNegocio: "Hojas verdes" })])).toEqual(["a"]);
    expect(buscar("jabonez")).toEqual(["jabones"]);
  });

  it("encuentra en el nombre y en la descripción de un producto", () => {
    expect(buscar("notebok")).toEqual(["dulces"]);
    expect(buscar("tostdo")).toEqual(["cafe"]);
    expect(buscar("yungaz")).toEqual(["cafe"]);
  });

  it("acepta una palabra de 6 letras o más a medio escribir y con un error (`jabonz`)", () => {
    expect(buscar("jabonz")).toEqual(["jabones"]);
    expect(buscar("natrales")).toEqual(["jabones"]);
  });

  it("una palabra de menos de 6 letras solo se compara con palabras completas: `torta` no se parece al comienzo de `tostado`", () => {
    expect(buscar("torta")).toEqual([]);
    expect(buscar("tosta")).toEqual(["cafe"]);
  });

  describe("errores probables de quien escribe", () => {
    const tazas = [perfil("t", { nombreNegocio: "Tazas" })];

    it("una vocal cambiada o una tecla vecina caben en una palabra de 5 letras (`tezas`, `tazad`)", () => {
      expect(buscar("tezas", tazas)).toEqual(["t"]);
      expect(buscar("tazad", tazas)).toEqual(["t"]);
    });

    it("dos errores probables ya se pasan en una palabra de 5 letras (`tezes`, `tszad`)", () => {
      expect(buscar("tezes", tazas)).toEqual([]);
      expect(buscar("tszad", tazas)).toEqual([]);
    });

    it("un error probable más uno que no lo es también (`tezxs`, `tszap`)", () => {
      expect(buscar("tezxs", tazas)).toEqual([]);
      expect(buscar("tszap", tazas)).toEqual([]);
    });

    it("en una palabra de 6 letras o más caben dos errores probables (`tezones` por `tazones`)", () => {
      expect(buscar("tezonas", [perfil("t", { nombreNegocio: "Tazones" })])).toEqual(["t"]);
    });

    it("no se acumulan hasta dejar pasar otra palabra (`dluces` no encuentra `Flores` ni `Lucía`)", () => {
      expect(buscar("dluces")).toEqual(["dulces"]);
    });

    it("dos errores que no son probables no caben en una palabra de 5 letras", () => {
      expect(buscar("slbxr", [perfil("s", { nombreNegocio: "Sabor" })])).toEqual([]);
      expect(buscar("sabxr", [perfil("s", { nombreNegocio: "Sabor" })])).toEqual(["s"]);
    });
  });

  it("una palabra de 3 letras tolera una diferencia; una de 2 o menos, ninguna", () => {
    const sol = [perfil("sol", { nombreNegocio: "Sol y luna" })];

    expect(buscar("sal", sol)).toEqual(["sol"]);
    expect(buscar("sul", sol)).toEqual(["sol"]);
    expect(buscar("su", sol)).toEqual([]);
  });

  it("en palabras de hasta 5 letras la primera no puede cambiar (`casa` no encuentra `masa`)", () => {
    const masa = [perfil("masa", { nombreNegocio: "Masa madre" })];

    expect(buscar("casa", masa)).toEqual([]);
    expect(buscar("mesa", masa)).toEqual(["masa"]);
  });

  it("una palabra de 6 letras o más tolera dos diferencias y no tres", () => {
    expect(buscar("pelukeria", [perfil("p", { nombreNegocio: "Peluquería Elegance" })])).toEqual(["p"]);
    expect(buscar("elgnace", [perfil("e", { nombreNegocio: "Elegance" })])).toEqual(["e"]);
    expect(buscar("elgnxcz", [perfil("e", { nombreNegocio: "Elegance" })])).toEqual([]);
  });

  it("los números no se aproximan: `101` no encuentra `100`", () => {
    const tarjeta = [perfil("t", { nombreNegocio: "Tarjeta 100" })];

    expect(buscar("101", tarjeta)).toEqual([]);
    expect(buscar("100", tarjeta)).toEqual(["t"]);
  });

  it("las palabras de enlace no impiden una coincidencia (`dulses de aarun`)", () => {
    expect(buscar("dulses de aarun")).toEqual(["dulces"]);
    expect(buscar("jabones para lucia")).toEqual(["jabones"]);
  });

  it("reconoce una palabra escrita pegada a la siguiente del texto o con un espacio de más", () => {
    expect(buscar("granotostado")).toEqual(["cafe"]);
    expect(buscar("16gb")).toEqual(["dulces"]);
    expect(buscar("tos tdo")).toEqual(["cafe"]);
    expect(buscar("jabo nez")).toEqual(["jabones"]);
  });

  it("todas las palabras deben parecerse a algo del perfil, en cualquier campo y orden", () => {
    expect(buscar("dulses aarun")).toEqual(["dulces"]);
    expect(buscar("aarun dulses")).toEqual(["dulces"]);
    expect(buscar("dulses tostdo")).toEqual([]);
    expect(buscar("dulses zzzzzz")).toEqual([]);
  });

  it("una palabra exacta y otra mal escrita se combinan", () => {
    expect(buscar("aaron macbok")).toEqual(["dulces"]);
    expect(buscar("cafe tostdo")).toEqual(["cafe"]);
  });

  it("no encuentra nada que no se parezca", () => {
    expect(buscar("zapatos")).toEqual([]);
    expect(buscar("torta")).toEqual([]);
    expect(buscar("pastel")).toEqual([]);
  });

  it("ordena por menos diferencias y, a igual número, por dónde se encontró y por el nombre del negocio", () => {
    const exactoEnDescripcion = perfil("descripcion", { nombreNegocio: "Zeta", descripcion: "Hacemos dulces caseros" });
    const exactoEnNombre = perfil("nombre", { nombreNegocio: "Dulces Zeta" });
    const aproximadoEnNombre = perfil("aproximado", { nombreNegocio: "Dulcez Alfa" });
    const exactoEnProducto = perfil("producto", { nombreNegocio: "Beta", productos: [{ nombre: "Dulces surtidos", descripcion: null }] });
    const otroExactoEnNombre = perfil("otro", { nombreNegocio: "Alfa dulces" });

    const orden = buscar("dulces", [exactoEnDescripcion, aproximadoEnNombre, exactoEnProducto, exactoEnNombre, otroExactoEnNombre]);

    expect(orden).toEqual(["otro", "nombre", "producto", "descripcion", "aproximado"]);
  });

  it("entre varios parecidos, va primero el que se parece más", () => {
    const casiIgual = perfil("casi", { nombreNegocio: "Zeta Dulcez" });
    const mas = perfil("mas", { nombreNegocio: "Alfa Duces" });

    expect(buscar("dulces", [mas, casiIgual])).toEqual(["casi", "mas"]);
  });

  it("no muestra los que se parecen mucho menos que el mejor: más de una diferencia por debajo", () => {
    const exacto = perfil("exacto", { nombreNegocio: "Dulces Alfa" });
    const unaDiferencia = perfil("una", { nombreNegocio: "Duces Beta" });
    const dosDiferencias = perfil("dos", { nombreNegocio: "Dlcs Gamma" });

    expect(buscar("dulces", [dosDiferencias, unaDiferencia, exacto])).toEqual(["exacto", "una"]);
    // Sin un mejor tan bueno, el que queda sí se muestra.
    expect(buscar("dulces", [dosDiferencias])).toEqual(["dos"]);
  });

  it("solo compara el comienzo de una descripción", () => {
    const larga = perfil("larga", { descripcion: `${"relleno ".repeat(60)}mermelada` });

    expect(buscar("mermelada", [larga])).toEqual([]);
  });

  it("un guion o un punto separan palabras y lo escrito sin letras ni números se ignora", () => {
    expect(buscar("maria-floress")).toEqual(["cafe"]);
    expect(buscar("dulses !!!")).toEqual(["dulces"]);
    expect(buscar("!!!")).toEqual([]);
    expect(buscar("   ")).toEqual([]);
  });

  it("ignora las palabras que pasan de seis, igual que la búsqueda exacta", () => {
    expect(buscar("dulses de prueba del smoke test macbok")).toEqual(["dulces"]);
  });

  it("sin perfiles no hay resultados", () => {
    expect(buscar("dulses", [])).toEqual([]);
  });

  it("no cambia los perfiles que recibe", () => {
    const copia = structuredClone(catalogo);

    buscar("dulses");

    expect(catalogo).toEqual(copia);
  });
});
