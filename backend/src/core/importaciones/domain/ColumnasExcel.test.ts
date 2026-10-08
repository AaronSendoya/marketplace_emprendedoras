import { describe, expect, it } from "vitest";
import { ENCABEZADOS_DE_GOOGLE_FORMS } from "../testing/dobles";
import { COLUMNAS, COLUMNAS_OBLIGATORIAS, ENCABEZADOS_DEL_FORMULARIO, detectarEncabezados, faltantes, normalizarEncabezado } from "./ColumnasExcel";

describe("normalizarEncabezado", () => {
  it("quita tildes, mayúsculas, espacios y signos", () => {
    expect(normalizarEncabezado("¿Te gustaría ofrecer algo especial?")).toBe("tegustariaofreceralgoespecial");
    expect(normalizarEncabezado("  Dirección de correo   electrónico ")).toBe("direcciondecorreoelectronico");
  });
});

describe("detectarEncabezados con los encabezados reales de Google Forms", () => {
  const deteccion = detectarEncabezados(ENCABEZADOS_DE_GOOGLE_FORMS);

  it("reconoce las 9 columnas que se usan, cada una en su posición", () => {
    expect(deteccion.columnas).toEqual({
      correo: 1,
      nombreCompleto: 2,
      whatsapp: 3,
      ciudad: 4,
      emprendimiento: 6,
      descripcion: 7,
      rubro: 9,
      instagram: 10,
      otraRed: 11,
    });
  });

  it("son 14 encabezados y la lista del dominio (la de la plantilla) es exactamente esa, con el espacio final del último", () => {
    expect(ENCABEZADOS_DE_GOOGLE_FORMS).toHaveLength(14);
    expect(ENCABEZADOS_DEL_FORMULARIO).toEqual(ENCABEZADOS_DE_GOOGLE_FORMS);
    expect(ENCABEZADOS_DEL_FORMULARIO[13]).toBe("Cuéntanos sobre tu beneficio ");
  });

  it("no lee nada por parecido: todo se reconoció por su texto", () => {
    expect(deteccion.aproximadas).toEqual([]);
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

  it("solo Instagram y otra red social son opcionales", () => {
    expect(COLUMNAS.filter((c) => !c.obligatoria).map((c) => c.clave)).toEqual(["instagram", "otraRed"]);
  });
});

describe("«Otra red social»", () => {
  it.each(["Otra red social", "OTRA RED SOCIAL", "otra red", "Otras redes sociales", "Red social"])("reconoce «%s»", (encabezado) => {
    expect(detectarEncabezados([encabezado]).columnas).toEqual({ otraRed: 0 });
  });

  it("no se confunde con Instagram", () => {
    expect(detectarEncabezados(["Instagram de tu emprendimiento", "Otra red social"]).columnas).toEqual({ instagram: 0, otraRed: 1 });
  });
});

describe("detectarEncabezados perdona erratas, y lo dice", () => {
  it.each([
    ["Ciudd", "Ciudad"],
    ["Cuidad", "Ciudad"],
    ["Rubr0", "Rubro"],
    ["Rubo", "Rubro"],
    ["Nombre Complto", "Nombre completo"],
    ["Numero de Whatsap", "Número de WhatsApp"],
    ["Breve descripcon", "Breve descripción"],
    ["Instagran de tu emprendimiento", "Instagram"],
    ["Otra rd social", "Otra red social"],
  ])("«%s» se lee como «%s»", (encabezado, columna) => {
    const deteccion = detectarEncabezados([encabezado]);

    expect(deteccion.aproximadas).toEqual([{ encabezado, columna }]);
    expect(deteccion.desconocidas).toEqual([]);
    expect(Object.keys(deteccion.columnas)).toHaveLength(1);
  });

  it("lo que se reconoce por su texto no se anota como aproximado", () => {
    expect(detectarEncabezados(["Ciudad", "Rubro"]).aproximadas).toEqual([]);
  });

  it("una columna que ya se reconoció no se la lleva otro encabezado parecido", () => {
    const deteccion = detectarEncabezados(["Ciudad", "Ciudd"]);

    expect(deteccion.columnas).toEqual({ ciudad: 0 });
    expect(deteccion.desconocidas).toEqual(["Ciudd"]);
  });

  it("lo que no se parece a nada queda como desconocido, sin forzarlo a ninguna columna", () => {
    const deteccion = detectarEncabezados(["Edad", "Producto", "Precio", "Stock", "Fecha de nacimiento", "Comentarios"]);

    expect(deteccion.columnas).toEqual({});
    expect(deteccion.aproximadas).toEqual([]);
    expect(deteccion.desconocidas).toEqual(["Edad", "Producto", "Precio", "Stock", "Fecha de nacimiento", "Comentarios"]);
  });

  it("una errata en una columna que se ignora a propósito sigue siendo una columna ignorada, no una desconocida", () => {
    const deteccion = detectarEncabezados(["Marca temporl", "Sube tu fotto"]);

    expect([...deteccion.ignoradas].sort()).toEqual(["Marca temporl", "Sube tu fotto"]);
    expect(deteccion.desconocidas).toEqual([]);
  });
});
