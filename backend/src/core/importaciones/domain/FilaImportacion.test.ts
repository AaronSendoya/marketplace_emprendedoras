import { describe, expect, it } from "vitest";
import { CIUDADES, RUBROS, celdasDePrueba, idDeCiudad, idDeRubro } from "../testing/dobles";
import type { Aviso } from "./Avisos";
import { construirFila, estadoDeAvisos, ordenarAvisos, validarDatosFila, type ContextoCatalogos, type DatosFila } from "./FilaImportacion";

const catalogos: ContextoCatalogos = { ciudades: CIUDADES, rubros: RUBROS };
const codigos = (avisos: Aviso[]) => avisos.map((a) => a.codigo);
const construir = (parches = {}) => construirFila(celdasDePrueba(parches), catalogos);

describe("construirFila: una fila completa y limpia", () => {
  const { datos, avisos } = construir();

  it("deja los datos normalizados, listos para crear la cuenta y el perfil", () => {
    expect(datos).toEqual({
      correo: "ana.perez@ejemplo.com",
      nombres: "Ana Maria",
      apellidoPaterno: "Perez",
      apellidoMaterno: "Rojas",
      whatsapp: "+59171234567",
      ciudadId: idDeCiudad("La Paz"),
      ciudadTexto: "La Paz",
      rubroId: idDeRubro("Alimentos y bebidas"),
      rubroTexto: "Alimentos y bebidas",
      nombreNegocio: "Dulces de Ana",
      descripcion: "Postres caseros y tortas por encargo.",
      instagram: "dulcesdeana",
      otraRedSocial: "",
    });
  });

  it("no tiene avisos: la fila queda «lista»", () => {
    expect(avisos).toEqual([]);
    expect(estadoDeAvisos(avisos)).toBe("lista");
  });
});

describe("construirFila: correo", () => {
  it("lo pasa a minúsculas y le quita los espacios", () => {
    expect(construir({ correo: "  Ana.Perez@Ejemplo.COM " }).datos.correo).toBe("ana.perez@ejemplo.com");
  });

  it.each(["", "   "])("un correo vacío (%j) es un error", (correo) => {
    const { avisos } = construir({ correo });

    expect(codigos(avisos)).toContain("correo_vacio");
    expect(estadoDeAvisos(avisos)).toBe("error");
  });

  it.each(["ana.perez", "ana@", "@ejemplo.com", "ana perez@ejemplo.com", "ana@ejemplo"])("«%s» no es un correo válido", (correo) => {
    const aviso = construir({ correo }).avisos.find((a) => a.codigo === "correo_invalido");

    expect(aviso?.severidad).toBe("error");
    expect(aviso?.mensaje).toContain("nombre@gmail.com");
  });
});

describe("construirFila: nombre (regla 10)", () => {
  it("de 3 palabras: se supone 1 nombre y 2 apellidos, se dice cómo se separó y queda «para revisar»", () => {
    const { datos, avisos } = construir({ nombreCompleto: "Ana Pérez Rojas" });

    expect(datos).toMatchObject({ nombres: "Ana", apellidoPaterno: "Pérez", apellidoMaterno: "Rojas" });
    expect(avisos.find((a) => a.codigo === "nombre_tres_palabras")?.mensaje).toBe("Revisa la separación: tomamos «Ana» como nombre y «Pérez Rojas» como apellidos.");
    expect(estadoDeAvisos(avisos)).toBe("revisar");
  });

  it("con un apellido compuesto avisa", () => {
    expect(codigos(construir({ nombreCompleto: "Juan Carlos de la Cruz" }).avisos)).toContain("nombre_apellido_compuesto");
  });

  it("de 4 palabras no avisa nada", () => {
    expect(codigos(construir({ nombreCompleto: "Ana María Pérez Rojas" }).avisos)).not.toContain("nombre_tres_palabras");
  });

  it("de una sola palabra es un error (falta el apellido)", () => {
    const { datos, avisos } = construir({ nombreCompleto: "Ana" });

    expect(datos.apellidoPaterno).toBe("");
    expect(avisos.find((a) => a.codigo === "nombre_una_palabra")?.severidad).toBe("error");
  });

  it("vacío es un error distinto", () => {
    expect(codigos(construir({ nombreCompleto: "" }).avisos)).toContain("nombre_vacio");
  });

  it("un nombre todo en mayúsculas se guarda con mayúscula inicial", () => {
    expect(construir({ nombreCompleto: "LUISA GUEIL JORDAN LEON" }).datos).toMatchObject({ nombres: "Luisa Gueil", apellidoPaterno: "Jordan" });
  });
});

describe("construirFila: WhatsApp (regla 2)", () => {
  it.each([
    ["71578947", "+59171578947"],
    ["+591 71234567", "+59171234567"],
    ["591-6012-3456", "+59160123456"],
    ["+54 9 11 2345 6789", "+5491123456789"],
  ])("«%s» queda como %s", (entrada, esperado) => {
    const { datos, avisos } = construir({ whatsapp: entrada });

    expect(datos.whatsapp).toBe(esperado);
    expect(codigos(avisos)).not.toContain("whatsapp_invalido");
  });

  it("vacío es un error", () => {
    expect(codigos(construir({ whatsapp: "" }).avisos)).toContain("whatsapp_vacio");
  });

  it.each(["hola", "7123", "81234567", "7123456789012", "71234567 ext 3"])("«%s» no es un WhatsApp válido y el mensaje dice qué hacer", (whatsapp) => {
    const aviso = construir({ whatsapp }).avisos.find((a) => a.codigo === "whatsapp_invalido");

    expect(aviso?.severidad).toBe("error");
    expect(aviso?.mensaje).toContain("En Bolivia son 8 dígitos y empiezan con 6 o 7");
    expect(aviso?.mensaje).toContain(`«${whatsapp}»`);
  });
});

describe("construirFila: ciudad y rubro", () => {
  it("una ciudad que no está en el catálogo es un error y el mensaje la nombra", () => {
    const { datos, avisos } = construir({ ciudad: "Riberalta" });

    expect(datos.ciudadId).toBe("");
    expect(avisos.find((a) => a.codigo === "ciudad_desconocida")?.mensaje).toBe("La ciudad «Riberalta» no existe en el sistema. Elige una de la lista.");
  });

  it("una ciudad vacía es un error distinto", () => {
    expect(codigos(construir({ ciudad: "" }).avisos)).toContain("ciudad_vacia");
  });

  it.each(RUBROS.map((rubro) => rubro.nombre))("el rubro oficial «%s» se resuelve tal cual, sin aviso", (nombre) => {
    const { datos, avisos } = construir({ rubro: nombre });

    expect(datos.rubroId).toBe(idDeRubro(nombre));
    expect(codigos(avisos).filter((codigo) => codigo.startsWith("rubro_"))).toEqual([]);
  });

  it("el rubro del Excel no distingue tildes, mayúsculas ni espacios de más", () => {
    expect(construir({ rubro: "  DISEÑO O  CONFECCION " }).datos.rubroId).toBe(idDeRubro("Diseño o confección"));
  });

  it.each(["Moda y accesorios", "Hogar y decoración", "Otros", "Servicios profesionales"])(
    "«%s», de la lista anterior, ya no es un rubro: queda con error y no se adivina otro",
    (texto) => {
      const { datos, avisos } = construir({ rubro: texto });

      expect(datos.rubroId).toBe("");
      expect(codigos(avisos)).toContain("rubro_desconocido");
    },
  );

  it("un rubro desconocido es un error, no se inventa uno", () => {
    const { datos, avisos } = construir({ rubro: "Astrología" });

    expect(datos.rubroId).toBe("");
    expect(avisos.find((a) => a.codigo === "rubro_desconocido")?.mensaje).toBe("No sabemos a qué rubro corresponde «Astrología». Elige uno de la lista.");
  });

  it("un rubro vacío es un error distinto", () => {
    expect(codigos(construir({ rubro: "" }).avisos)).toContain("rubro_vacio");
  });
});

describe("construirFila: emprendimiento y descripción", () => {
  it("ordena los espacios del nombre del emprendimiento", () => {
    expect(construir({ emprendimiento: "  Dulces   de  Ana " }).datos.nombreNegocio).toBe("Dulces de Ana");
  });

  it("falta el nombre o la descripción: errores", () => {
    const { avisos } = construir({ emprendimiento: "", descripcion: "" });

    expect(codigos(avisos)).toEqual(expect.arrayContaining(["negocio_vacio", "descripcion_vacia"]));
  });

  it("un nombre de más de 150 caracteres o una descripción de más de 2000 dicen cuánto miden", () => {
    const { avisos } = construir({ emprendimiento: "a".repeat(151), descripcion: "b".repeat(2001) });

    expect(avisos.find((a) => a.codigo === "negocio_largo")?.mensaje).toBe("El nombre del emprendimiento tiene 151 caracteres; el máximo es 150.");
    expect(avisos.find((a) => a.codigo === "descripcion_larga")?.mensaje).toBe("La descripción tiene 2001 caracteres; el máximo es 2000.");
  });

  it("los límites exactos (150 y 2000) se aceptan", () => {
    const { avisos } = construir({ emprendimiento: "a".repeat(150), descripcion: "b".repeat(2000) });

    expect(estadoDeAvisos(avisos)).not.toBe("error");
  });
});

describe("construirFila: Instagram y otra red", () => {
  it("«No tengo» se deja vacío y solo informa", () => {
    const { datos, avisos } = construir({ instagram: "No tengo" });

    expect(datos.instagram).toBe("");
    expect(avisos.find((a) => a.codigo === "instagram_ninguno")).toMatchObject({ severidad: "info", reporte: false });
  });

  it("un texto irreconocible se deja vacío, queda «para revisar» y va al reporte", () => {
    const { datos, avisos, textos } = construir({ instagram: "Nutrimentos maybo" });

    expect(datos.instagram).toBe("");
    expect(avisos.find((a) => a.codigo === "instagram_irreconocible")).toMatchObject({ severidad: "revisar", reporte: true });
    expect(textos.instagram).toBe("Nutrimentos maybo");
  });

  it("un enlace de Facebook o una web se guarda como «otra red social»", () => {
    const { datos, avisos } = construir({ instagram: "https://www.facebook.com/NativaBolivia" });

    expect(datos).toMatchObject({ instagram: "", otraRedSocial: "https://www.facebook.com/NativaBolivia" });
    expect(avisos.find((a) => a.codigo === "otra_red")?.mensaje).toBe("Este enlace no es de Instagram. Se guardará como «otra red social».");
  });

  it("un enlace de más de 50 caracteres no cabe: se deja vacío y va al reporte", () => {
    const { datos, avisos } = construir({ instagram: `https://www.facebook.com/${"a".repeat(60)}` });

    expect(datos.otraRedSocial).toBe("");
    expect(avisos.find((a) => a.codigo === "otra_red_larga")).toMatchObject({ severidad: "info", reporte: true });
  });

  it("sin la columna de Instagram, la fila se importa sin Instagram y sin avisos", () => {
    const { avisos } = construirFila(celdasDePrueba({ instagram: undefined }), catalogos);

    expect(codigos(avisos)).not.toContain("instagram_ninguno");
  });
});

describe("construirFila: la columna «Otra red social»", () => {
  it("se guarda tal cual, recortada y sin saltos de más, sin avisos", () => {
    const { datos, avisos, textos } = construir({ instagram: "@dulcesdeana", otraRed: "  TikTok:   @dulcesdeana " });

    expect(datos).toMatchObject({ instagram: "dulcesdeana", otraRedSocial: "TikTok: @dulcesdeana" });
    expect(avisos).toEqual([]);
    expect(textos).toEqual({ instagram: "@dulcesdeana", otraRed: "TikTok:   @dulcesdeana" });
  });

  it("«No tengo» y similares cuentan como vacío y no avisan", () => {
    for (const texto of ["No tengo", "ninguna", "-", "N/A"]) {
      const { datos, avisos } = construir({ otraRed: texto });

      expect(datos.otraRedSocial).toBe("");
      expect(avisos).toEqual([]);
    }
  });

  it("de más de 50 caracteres no cabe: se deja vacía, va al reporte y el aviso es de su campo", () => {
    const { datos, avisos } = construir({ otraRed: "x".repeat(51) });

    expect(datos.otraRedSocial).toBe("");
    expect(avisos.find((a) => a.codigo === "otra_red_larga")).toMatchObject({ campo: "otraRedSocial", severidad: "info", reporte: true });
  });

  it("los 50 caracteres justos caben", () => {
    expect(construir({ otraRed: "x".repeat(50) }).datos.otraRedSocial).toBe("x".repeat(50));
  });

  it("si trae las dos cosas manda su columna y el enlace de Instagram queda «para revisar» en el reporte", () => {
    const { datos, avisos } = construir({ instagram: "https://www.facebook.com/NativaBolivia", otraRed: "TikTok @nativa" });

    expect(datos).toMatchObject({ instagram: "", otraRedSocial: "TikTok @nativa" });
    expect(avisos.find((a) => a.codigo === "otra_red_repetida")).toMatchObject({ campo: "instagram", severidad: "revisar", reporte: true });
    expect(codigos(avisos)).not.toContain("otra_red");
  });

  it("si su columna está vacía se usa el enlace que no es de Instagram de la otra, como antes", () => {
    const { datos, avisos } = construir({ instagram: "https://www.facebook.com/NativaBolivia", otraRed: "" });

    expect(datos.otraRedSocial).toBe("https://www.facebook.com/NativaBolivia");
    expect(codigos(avisos)).toContain("otra_red");
  });

  it("si su columna es demasiado larga y la de Instagram trae un enlace corto, se usa el enlace y se avisa de lo largo", () => {
    const { datos, avisos } = construir({ instagram: "https://www.facebook.com/Nativa", otraRed: "x".repeat(80) });

    expect(datos.otraRedSocial).toBe("https://www.facebook.com/Nativa");
    expect(codigos(avisos)).toEqual(expect.arrayContaining(["otra_red_larga", "otra_red"]));
  });

  it("sin la columna, la fila queda sin otra red social y sin avisos", () => {
    const { datos, avisos } = construirFila(celdasDePrueba({ otraRed: undefined }), catalogos);

    expect(datos.otraRedSocial).toBe("");
    expect(avisos).toEqual([]);
  });
});

describe("validarDatosFila: lo que corrige el Admin en la vista previa", () => {
  const buenos = (): DatosFila => construir().datos;

  it("datos buenos no tienen errores", () => {
    expect(validarDatosFila(buenos(), catalogos)).toEqual([]);
  });

  it("una ciudad o un rubro que no existen en el catálogo (un id inventado) son errores", () => {
    const avisos = validarDatosFila({ ...buenos(), ciudadId: "ciudad-que-no-existe", rubroId: "rubro-que-no-existe" }, catalogos);

    expect(codigos(avisos)).toEqual(["ciudad_desconocida", "rubro_desconocido"]);
  });

  it("un usuario de Instagram inválido escrito a mano es un error", () => {
    const avisos = validarDatosFila({ ...buenos(), instagram: "mi tienda!!" }, catalogos);

    expect(avisos.find((a) => a.codigo === "instagram_invalido")?.severidad).toBe("error");
  });

  it("«otra red social» de más de 50 caracteres es un error", () => {
    expect(codigos(validarDatosFila({ ...buenos(), otraRedSocial: "x".repeat(51) }, catalogos))).toEqual(["otra_red_larga"]);
  });

  it("un nombre o apellido demasiado largo es un error", () => {
    expect(codigos(validarDatosFila({ ...buenos(), apellidoPaterno: "a".repeat(51) }, catalogos))).toEqual(["nombre_largo"]);
    expect(codigos(validarDatosFila({ ...buenos(), nombres: "a".repeat(101) }, catalogos))).toEqual(["nombre_largo"]);
  });

  it("sin apellido materno es válido (regla 10)", () => {
    expect(validarDatosFila({ ...buenos(), apellidoMaterno: "" }, catalogos)).toEqual([]);
  });
});

describe("estado y orden de los avisos", () => {
  const aviso = (severidad: Aviso["severidad"]): Aviso => ({ campo: "fila", codigo: severidad, severidad, mensaje: severidad, reporte: false });

  it("un error manda sobre «revisar» y este sobre una simple información", () => {
    expect(estadoDeAvisos([aviso("info"), aviso("revisar"), aviso("error")])).toBe("error");
    expect(estadoDeAvisos([aviso("info"), aviso("revisar")])).toBe("revisar");
    expect(estadoDeAvisos([aviso("info")])).toBe("lista");
    expect(estadoDeAvisos([])).toBe("lista");
  });

  it("los errores van primero y las informaciones al final", () => {
    expect(ordenarAvisos([aviso("info"), aviso("error"), aviso("revisar")]).map((a) => a.severidad)).toEqual(["error", "revisar", "info"]);
  });

  it("construirFila devuelve los avisos ya ordenados", () => {
    const { avisos } = construir({ whatsapp: "hola", nombreCompleto: "Ana Pérez Rojas", instagram: "No tengo" });

    expect(avisos.map((a) => a.severidad)).toEqual(["error", "revisar", "info"]);
  });
});

describe("el WhatsApp de la vista previa se puede validar otra vez sin cambiar", () => {
  it.each(["71578947", "+54 9 11 2345 6789", "00 34 612 345 678", "591 60123456"])("«%s»: lo que sale de construirFila pasa la validación", (entrada) => {
    const { datos } = construirFila(celdasDePrueba({ whatsapp: entrada }), catalogos);

    expect(validarDatosFila(datos, catalogos).map((a) => a.codigo)).not.toContain("whatsapp_invalido");
    expect(datos.whatsapp.startsWith("+")).toBe(true);
  });
});
