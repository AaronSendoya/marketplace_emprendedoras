import { describe, expect, it } from "vitest";
import { EsquemaDatosFila, EsquemaFilasBody } from "./importaciones";

const datos = {
  correo: "ana@ejemplo.com",
  nombres: "Ana María",
  apellido_paterno: "Pérez",
  apellido_materno: "Rojas",
  whatsapp: "+59171234567",
  ciudad_id: "ciudad-1",
  rubro_id: "rubro-1",
  nombre_negocio: "Dulces de Ana",
  descripcion: "Postres caseros",
  instagram: "dulcesdeana",
  otra_red_social: "",
};
const fila = (n = 2) => ({ fila: n, datos });

describe("EsquemaFilasBody (regla 22)", () => {
  it("acepta de 1 a 10 filas y completa el texto de ciudad y rubro si faltan", () => {
    const cuerpo = EsquemaFilasBody.parse({ filas: [fila()] });

    expect(cuerpo.filas[0].datos).toMatchObject({ ciudad_texto: "", rubro_texto: "" });
    expect(EsquemaFilasBody.safeParse({ filas: Array.from({ length: 10 }, (_, i) => fila(i + 2)) }).success).toBe(true);
  });

  it("rechaza 0 filas, más de 10 y un cuerpo sin filas", () => {
    expect(EsquemaFilasBody.safeParse({ filas: [] }).success).toBe(false);
    expect(EsquemaFilasBody.safeParse({ filas: Array.from({ length: 11 }, (_, i) => fila(i + 2)) }).success).toBe(false);
    expect(EsquemaFilasBody.safeParse({}).success).toBe(false);
  });

  it("rechaza campos ajenos en el cuerpo, en la fila y en los datos (nada de asignación masiva)", () => {
    expect(EsquemaFilasBody.safeParse({ filas: [fila()], rol: "Admin" }).success).toBe(false);
    expect(EsquemaFilasBody.safeParse({ filas: [{ ...fila(), rol: "Admin" }] }).success).toBe(false);
    expect(EsquemaFilasBody.safeParse({ filas: [{ fila: 2, datos: { ...datos, rol: "Admin" } }] }).success).toBe(false);
    expect(EsquemaFilasBody.safeParse({ filas: [{ fila: 2, datos: { ...datos, password: "x" } }] }).success).toBe(false);
  });

  it.each([0, -1, 1.5, 2_000_000, "2"])("rechaza un número de fila inválido (%j)", (n) => {
    expect(EsquemaFilasBody.safeParse({ filas: [{ fila: n, datos }] }).success).toBe(false);
  });

  it("rechaza datos que no son texto y textos enormes (frena abusos sin quitarle al dominio los mensajes)", () => {
    expect(EsquemaDatosFila.safeParse({ ...datos, correo: 123 }).success).toBe(false);
    expect(EsquemaDatosFila.safeParse({ ...datos, descripcion: "x".repeat(10_000) }).success).toBe(false);
    expect(EsquemaDatosFila.safeParse({ ...datos, correo: "x".repeat(5000) }).success).toBe(false);
  });

  it("un texto demasiado largo para el dominio pero razonable para el esquema llega al dominio, que lo explica", () => {
    expect(EsquemaDatosFila.safeParse({ ...datos, nombre_negocio: "x".repeat(151) }).success).toBe(true);
    expect(EsquemaDatosFila.safeParse({ ...datos, descripcion: "x".repeat(2001) }).success).toBe(true);
  });

  it("el beneficio ya no es un dato de la fila: mandarlo es un campo ajeno (regla 22)", () => {
    expect(EsquemaDatosFila.safeParse({ ...datos, beneficio: null }).success).toBe(false);
    expect(EsquemaDatosFila.safeParse({ ...datos, beneficio: { porcentaje: 10, descripcion: "x" } }).success).toBe(false);
  });
});
