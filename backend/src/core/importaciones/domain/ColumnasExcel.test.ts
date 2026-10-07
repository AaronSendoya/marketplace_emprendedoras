import { describe, expect, it } from "vitest";
import { ENCABEZADOS_DE_GOOGLE_FORMS } from "../testing/dobles";
import { COLUMNAS, COLUMNAS_OBLIGATORIAS, detectarEncabezados, faltantes, normalizarEncabezado } from "./ColumnasExcel";

describe("normalizarEncabezado", () => {
  it("quita tildes, mayúsculas, espacios y signos", () => {
    expect(normalizarEncabezado("¿Te gustaría ofrecer algo especial?")).toBe("tegustariaofreceralgoespecial");
    expect(normalizarEncabezado("  Dirección de correo   electrónico ")).toBe("direcciondecorreoelectronico");
  });
});

describe("detectarEncabezados con los encabezados reales de Google Forms", () => {
  const deteccion = detectarEncabezados(ENCABEZADOS_DE_GOOGLE_FORMS);

  it("reconoce las 8 columnas que se usan, cada una en su posición", () => {
    expect(deteccion.columnas).toEqual({
      correo: 1,
      nombreCompleto: 2,
      whatsapp: 3,
      ciudad: 4,
      emprendimiento: 6,
      descripcion: 7,
      rubro: 9,
      instagram: 10,
    });
  });

  it("ignora a propósito la marca temporal, las fotos, el logo y el beneficio, y no deja nada sin explicar", () => {
    expect(deteccion.ignoradas).toEqual([
      "Marca temporal",
      "Sube tu foto",
      "Sube el logo de tu emprendimiento",
      "¿Te gustaría ofrecer algo especial a las emprendedoras del Track de Mujeres 2026?",
      "Cuéntanos sobre tu beneficio",
    ]);
    expect(deteccion.desconocidas).toEqual([]);
  });

  it("no falta ninguna columna obligatoria", () => {
    expect(faltantes(deteccion)).toEqual([]);
  });
});

describe("detectarEncabezados es tolerante", () => {
  it("el orden de las columnas no importa", () => {
    const deteccion = detectarEncabezados(["Rubro", "Ciudad", "Número de WhatsApp", "Nombre Completo", "Correo"]);

    expect(deteccion.columnas).toMatchObject({ rubro: 0, ciudad: 1, whatsapp: 2, nombreCompleto: 3, correo: 4 });
  });

  it("no distingue mayúsculas, tildes ni espacios de más", () => {
    const deteccion = detectarEncabezados(["  CORREO ELECTRÓNICO ", "nombre   completo", "NUMERO DE WHATSAPP", "ciudad"]);

    expect(Object.keys(deteccion.columnas).sort()).toEqual(["ciudad", "correo", "nombreCompleto", "whatsapp"]);
  });

  it("acepta redacciones parecidas (email, celular, nombre del negocio)", () => {
    const deteccion = detectarEncabezados(["Email", "Nombre", "Celular", "Ciudad", "Nombre del negocio", "Descripción", "Rubro"]);

    expect(faltantes(deteccion)).toEqual([]);
  });

  it("un encabezado desconocido no rompe nada: se anota y se sigue", () => {
    const deteccion = detectarEncabezados(["Correo", "Edad", "Ciudad"]);

    expect(deteccion.desconocidas).toEqual(["Edad"]);
    expect(deteccion.columnas).toMatchObject({ correo: 0, ciudad: 2 });
  });

  it("cada columna se asigna una sola vez (la primera) y las celdas vacías se saltan", () => {
    const deteccion = detectarEncabezados(["Correo", "", "Correo alterno"]);

    expect(deteccion.columnas.correo).toBe(0);
    expect(deteccion.desconocidas).toEqual(["Correo alterno"]);
  });

  it("«¿Te gustaría ofrecer…?» y «Cuéntanos sobre tu beneficio» no se registran: se ignoran, con cualquier redacción", () => {
    const deteccion = detectarEncabezados(["¿Te gustaría ofrecer un beneficio especial?", "Cuéntanos sobre tu beneficio", "Beneficio"]);

    expect(deteccion.columnas).toEqual({});
    expect(deteccion.ignoradas).toHaveLength(3);
    expect(deteccion.desconocidas).toEqual([]);
  });
});

describe("columnas obligatorias", () => {
  it("son siete: correo, nombre, WhatsApp, ciudad, emprendimiento, descripción y rubro", () => {
    expect(COLUMNAS_OBLIGATORIAS.map((c) => c.clave)).toEqual(["correo", "nombreCompleto", "whatsapp", "ciudad", "emprendimiento", "descripcion", "rubro"]);
  });

  it("faltantes devuelve las que no están, con el nombre que ve el Admin", () => {
    const deteccion = detectarEncabezados(["Correo", "Ciudad", "Rubro", "Instagram"]);

    expect(faltantes(deteccion).map((c) => c.nombre)).toEqual(["Nombre completo", "Número de WhatsApp", "Nombre de tu emprendimiento", "Breve descripción"]);
  });

  it("solo Instagram es opcional", () => {
    expect(COLUMNAS.filter((c) => !c.obligatoria).map((c) => c.clave)).toEqual(["instagram"]);
  });
});
