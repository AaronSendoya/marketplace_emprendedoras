import { describe, expect, it } from "vitest";
import { UsuarioRepositoryEnMemoria } from "@/core/auth/testing/UsuarioRepositoryEnMemoria";
import { usuarioDePrueba } from "@/core/auth/testing/dobles";
import { ErrorValidacion } from "@/shared/domain/errors";
import { validarDatosFila } from "../domain/FilaImportacion";
import { MENSAJES_ARCHIVO } from "../domain/ArchivoExcel";
import { GeneradorPlantillaExceljs } from "../infrastructure/GeneradorPlantillaExceljs";
import { LectorExcelExceljs } from "../infrastructure/LectorExcelExceljs";
import { CIUDADES, ENCABEZADOS_DE_GOOGLE_FORMS, RUBROS, catalogoEnMemoria, crearExcelDePrueba, filaDeFormulario, idDeCiudad, idDeRubro } from "../testing/dobles";
import { AnalizarExcelEmprendedorasUseCase, MAXIMO_DE_FILAS_POR_IMPORTACION, MENSAJES_ANALISIS } from "./AnalizarExcelEmprendedoras";

const construir = (usuarios = new UsuarioRepositoryEnMemoria()) => ({
  usuarios,
  caso: new AnalizarExcelEmprendedorasUseCase(new LectorExcelExceljs(), usuarios, catalogoEnMemoria),
});

const analizar = async (opciones: Parameters<typeof crearExcelDePrueba>[0], usuarios?: UsuarioRepositoryEnMemoria) =>
  construir(usuarios).caso.ejecutar({ nombre: "emprendedoras.xlsx", contenido: await crearExcelDePrueba(opciones) });

const mensajeDelRechazo = async (promesa: Promise<unknown>) => {
  try {
    await promesa;
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorValidacion);
    return (error as ErrorValidacion).message;
  }
  throw new Error("Debía rechazar el archivo");
};

describe("AnalizarExcelEmprendedorasUseCase: un archivo como el del formulario", () => {
  it("reconoce las columnas (también la foto y el logo), ignora a propósito la marca temporal y el beneficio, y dice cuáles opcionales faltan", async () => {
    const resultado = await analizar({ filas: [filaDeFormulario()] });

    expect(resultado.hoja).toBe("Respuestas de formulario 1");
    expect(resultado.columnas.reconocidas).toHaveLength(11);
    expect(resultado.columnas.reconocidas).toEqual(expect.arrayContaining(["Foto de perfil", "Logo"]));
    expect(resultado.columnas.ignoradas).toEqual([
      "Marca temporal",
      "¿Te gustaría ofrecer algo especial a las emprendedoras del Track de Mujeres 2026?",
      "Cuéntanos sobre tu beneficio",
    ]);
    expect(resultado.columnas).toMatchObject({ opcionalesAusentes: [], obligatoriasAusentes: [], desconocidas: [], aproximadas: [] });
  });

  it("una fila limpia queda «lista», con los datos normalizados y el número de fila de Excel", async () => {
    const [fila] = (await analizar({ filas: [filaDeFormulario()] })).filas;

    expect(fila).toMatchObject({ fila: 2, oculta: false, estado: "lista", yaExiste: false, repetidaDe: null });
    expect(fila.datos).toMatchObject({
      correo: "ana.perez@ejemplo.com",
      nombres: "Ana María",
      apellidoPaterno: "Pérez",
      apellidoMaterno: "Rojas",
      whatsapp: "+59171234567",
      ciudadId: idDeCiudad("La Paz"),
      rubroId: idDeRubro("Alimentos y bebidas"),
      instagram: "dulcesdeana",
    });
  });

  it("el WhatsApp guardado como número de Excel se lee bien (7.1578947E7 es 71578947)", async () => {
    const [fila] = (await analizar({ filas: [filaDeFormulario({ whatsapp: 7.1578947e7 })] })).filas;

    expect(fila.datos.whatsapp).toBe("+59171578947");
    expect(fila.avisos.map((a) => a.codigo)).not.toContain("whatsapp_invalido");
  });

  it("resume la hoja: listas, para revisar, con error, repetidas y ocultas", async () => {
    const { resumen } = await analizar({
      filas: [
        filaDeFormulario(),
        filaDeFormulario({ correo: "dos@ejemplo.com", nombre: "Ana Pérez Rojas" }),
        filaDeFormulario({ correo: "tres@ejemplo.com", whatsapp: "hola" }),
        filaDeFormulario({ correo: "ana.perez@ejemplo.com" }),
        filaDeFormulario({ correo: "cinco@ejemplo.com" }),
      ],
      ocultas: [6],
    });

    expect(resumen).toEqual({ total: 5, listas: 2, revisar: 1, conError: 1, yaExisten: 0, repetidas: 1, ocultas: 1 });
  });
});

describe("AnalizarExcelEmprendedorasUseCase: advertencias por fila", () => {
  it("un correo repetido en el archivo marca la segunda aparición e indica en qué fila está la primera", async () => {
    const { filas } = await analizar({ filas: [filaDeFormulario(), filaDeFormulario({ nombre: "Otra Persona Distinta" })] });

    expect(filas[0].estado).toBe("lista");
    expect(filas[1]).toMatchObject({ estado: "repetida", repetidaDe: 2 });
    expect(filas[1].avisos.find((a) => a.codigo === "correo_repetido")?.mensaje).toBe("Este correo ya aparece en la fila 2. Se importará solo la primera.");
  });

  it("un correo que ya tiene cuenta queda «ya existe», con el mensaje de que se omitirá", async () => {
    const usuarios = new UsuarioRepositoryEnMemoria([usuarioDePrueba({ email: "ana.perez@ejemplo.com" })]);

    const { filas, resumen } = await analizar({ filas: [filaDeFormulario(), filaDeFormulario({ correo: "nueva@ejemplo.com" })] }, usuarios);

    expect(filas[0]).toMatchObject({ estado: "ya_existe", yaExiste: true });
    expect(filas[0].avisos.map((a) => a.codigo)).toContain("correo_existente");
    expect(filas[1].estado).toBe("lista");
    expect(resumen.yaExisten).toBe(1);
  });

  it("no consulta la base con un correo que no tiene forma de correo", async () => {
    const consultados: string[] = [];
    const usuarios = new UsuarioRepositoryEnMemoria();
    const original = usuarios.buscarPorEmail.bind(usuarios);
    usuarios.buscarPorEmail = async (email: string) => {
      consultados.push(email);
      return original(email);
    };

    await analizar({ filas: [filaDeFormulario({ correo: "esto-no-es-un-correo" }), filaDeFormulario({ correo: "ok@ejemplo.com" })] }, usuarios);

    expect(consultados).toEqual(["ok@ejemplo.com"]);
  });

  it("una fila oculta por un filtro se lee igual, queda marcada y se explica", async () => {
    const { filas } = await analizar({ filas: [filaDeFormulario(), filaDeFormulario({ correo: "dos@ejemplo.com" })], ocultas: [3] });

    expect(filas[0].oculta).toBe(false);
    expect(filas[1].oculta).toBe(true);
    expect(filas[1].avisos.find((a) => a.codigo === "fila_oculta")?.mensaje).toBe(
      "Esta fila estaba oculta por un filtro del Excel. Quedó sin marcar; márcala si quieres importarla.",
    );
  });

  it("guarda lo que decía el Excel en Instagram para el reporte «por revisar»", async () => {
    const [fila] = (await analizar({ filas: [filaDeFormulario({ instagram: "Nutrimentos maybo" })] })).filas;

    expect(fila.textos).toEqual({ instagram: "Nutrimentos maybo", otraRed: "" });
    expect(fila.avisos.filter((a) => a.reporte).map((a) => a.codigo)).toEqual(["instagram_irreconocible"]);
  });

  it("el beneficio del formulario no se guarda: ni datos, ni avisos, ni descuento, diga lo que diga", async () => {
    const filas = [
      filaDeFormulario({ ofrece: "Sí", beneficio: "15% de descuento en toda la tienda" }),
      filaDeFormulario({ correo: "dos@ejemplo.com", ofrece: "No", beneficio: "Descuento de 10 a 20 bs" }),
      filaDeFormulario({ correo: "tres@ejemplo.com", ofrece: "", beneficio: "" }),
    ];
    const resultado = await analizar({ filas });

    expect(resultado.resumen).toMatchObject({ total: 3, listas: 3 });
    for (const fila of resultado.filas) {
      expect(fila.datos).not.toHaveProperty("beneficio");
      expect(fila.textos).toEqual({ instagram: "@dulcesdeana", otraRed: "" });
      expect(fila.avisos).toEqual([]);
    }
  });

  it("los números de fila siguen a los de Excel aunque haya filas vacías en medio", async () => {
    const { filas } = await analizar({ filas: [filaDeFormulario(), [], filaDeFormulario({ correo: "dos@ejemplo.com" })] });

    expect(filas.map((f) => f.fila)).toEqual([2, 4]);
  });
});

describe("AnalizarExcelEmprendedorasUseCase: el archivo es compatible pero no tiene el formato esperado", () => {
  it("un archivo cuyas columnas no se parecen a las esperadas dice qué se leyó y qué falta", async () => {
    const mensaje = await mensajeDelRechazo(analizar({ encabezados: ["Producto", "Precio", "Stock"], filas: [["Torta", 10, 3]] }));

    expect(mensaje).toContain("El archivo no se parece al del formulario");
    expect(mensaje).toContain("Encabezados leídos en la fila 1: «Producto», «Precio», «Stock».");
    expect(mensaje).toContain("Faltan las columnas «Correo»");
    expect(mensaje).toContain("Los encabezados deben estar en la fila 1 y llamarse como en la guía.");
  });

  it("con solo 3 columnas reconocidas no se parece al formulario y se rechaza; con 4 se acepta", async () => {
    const tres = ["Correo", "Ciudad", "Rubro", "Edad"];
    expect(await mensajeDelRechazo(analizar({ encabezados: tres, filas: [["a@b.co", "La Paz", "Comercio", 30]] }))).toContain("no se parece");

    const cuatro = ["Correo", "Ciudad", "Rubro", "Número de WhatsApp", "Edad"];
    const resultado = await analizar({ encabezados: cuatro, filas: [["a@b.co", "La Paz", "Comercio", 71234567, 30]] });
    expect(resultado.filas).toHaveLength(1);
  });

  it("los encabezados que no están en la primera fila se explican", async () => {
    expect(await mensajeDelRechazo(analizar({ filasArriba: [["Respuestas de la convocatoria 2026"]], filas: [filaDeFormulario()] }))).toBe(
      MENSAJES_ANALISIS.encabezadosNoEstanEnFila1,
    );
  });

  it("solo los encabezados, sin ninguna fila de datos", async () => {
    expect(await mensajeDelRechazo(analizar({ filas: [] }))).toBe(MENSAJES_ANALISIS.sinFilas);
  });

  it("un libro completamente vacío", async () => {
    expect(await mensajeDelRechazo(analizar({ encabezados: [], filas: [] }))).toBe(MENSAJES_ANALISIS.sinFilas);
  });

  it("más de 500 filas, con la cantidad real en el mensaje", async () => {
    const filas = Array.from({ length: MAXIMO_DE_FILAS_POR_IMPORTACION + 1 }, (_, i) => filaDeFormulario({ correo: `persona${i}@ejemplo.com` }));

    expect(await mensajeDelRechazo(analizar({ filas }))).toBe(MENSAJES_ANALISIS.demasiadasFilas(501));
  });

  it("exactamente 500 filas sí se analizan", async () => {
    const filas = Array.from({ length: MAXIMO_DE_FILAS_POR_IMPORTACION }, (_, i) => filaDeFormulario({ correo: `persona${i}@ejemplo.com` }));

    expect((await analizar({ filas })).resumen.total).toBe(500);
  });

  it("con varias hojas lee la que tiene los encabezados, aunque no sea la primera, y las lista todas", async () => {
    const libro = await crearExcelDePrueba({
      nombreHoja: "Notas",
      encabezados: ["Nada", "Importante"],
      filas: [["a", "b"]],
      otrasHojas: [{ nombre: "Respuestas", filas: [ENCABEZADOS_DE_GOOGLE_FORMS, filaDeFormulario()] }],
    });

    const resultado = await construir().caso.ejecutar({ nombre: "libro.xlsx", contenido: libro });

    expect(resultado.hoja).toBe("Respuestas");
    expect(resultado.hojas).toEqual(["Notas", "Respuestas"]);
    expect(resultado.filas).toHaveLength(1);
  });

  it("las columnas opcionales que no vienen se anotan y la fila se importa sin ese dato", async () => {
    const quitar = (h: string) => !/Instagram|Otra red/i.test(h);
    const indices = ENCABEZADOS_DE_GOOGLE_FORMS.map((h, i) => [h, i] as const).filter(([h]) => quitar(h)).map(([, i]) => i);
    const resultado = await analizar({
      encabezados: ENCABEZADOS_DE_GOOGLE_FORMS.filter(quitar),
      filas: [filaDeFormulario().filter((_, i) => indices.includes(i))],
    });

    expect(resultado.columnas.opcionalesAusentes).toEqual(["Instagram", "Otra red social"]);
    expect(resultado.filas[0]).toMatchObject({ estado: "lista" });
    expect(resultado.filas[0].datos).toMatchObject({ instagram: "", otraRedSocial: "" });
  });
});

describe("AnalizarExcelEmprendedorasUseCase: tolerancia con el formato (regla 22)", () => {
  // El archivo del formulario sin las columnas cuyo encabezado cumple `quitar`, con sus celdas también quitadas.
  const sin = (quitar: RegExp) => {
    const indices = ENCABEZADOS_DE_GOOGLE_FORMS.map((h, i) => [h, i] as const).filter(([h]) => !quitar.test(h)).map(([, i]) => i);
    return {
      encabezados: ENCABEZADOS_DE_GOOGLE_FORMS.filter((_, i) => indices.includes(i)),
      filas: [filaDeFormulario(), filaDeFormulario({ correo: "dos@ejemplo.com" })].map((fila) => fila.filter((_, i) => indices.includes(i))),
    };
  };

  it("una columna obligatoria que falta no rechaza el archivo: se anota y cada fila queda con el error de ese dato", async () => {
    const resultado = await analizar(sin(/WhatsApp/));

    expect(resultado.columnas.obligatoriasAusentes).toEqual(["Número de WhatsApp"]);
    expect(resultado.columnas.reconocidas).toHaveLength(10);
    expect(resultado.resumen).toMatchObject({ total: 2, listas: 0, conError: 2 });
    for (const fila of resultado.filas) {
      expect(fila.estado).toBe("error");
      expect(fila.avisos.map((a) => a.codigo)).toEqual(["whatsapp_vacio"]);
      expect(fila.datos).toMatchObject({ correo: expect.any(String), ciudadId: idDeCiudad("La Paz"), whatsapp: "" });
    }
  });

  it("varias columnas obligatorias que faltan se anotan todas, en el orden del formulario", async () => {
    const resultado = await analizar(sin(/WhatsApp|Rubro|Ciudad/));

    expect(resultado.columnas.obligatoriasAusentes).toEqual(["Número de WhatsApp", "Ciudad", "Rubro"]);
    expect(resultado.filas[0].avisos.map((a) => a.codigo).sort()).toEqual(["ciudad_vacia", "rubro_vacio", "whatsapp_vacio"]);
  });

  it("sin la columna de correo se lee igual: las filas piden el correo y no se consulta la base", async () => {
    const resultado = await analizar(sin(/correo/i));

    expect(resultado.columnas.obligatoriasAusentes).toEqual(["Correo"]);
    expect(resultado.filas.map((f) => f.avisos.map((a) => a.codigo))).toEqual([["correo_vacio"], ["correo_vacio"]]);
    expect(resultado.filas.map((f) => f.estado)).toEqual(["error", "error"]);
  });

  it("completar lo que falta es posible: validar acepta la fila con el dato puesto a mano", async () => {
    const resultado = await analizar(sin(/Ciudad/));
    const datos = { ...resultado.filas[0].datos, ciudadId: idDeCiudad("La Paz") };

    const errores = validarDatosFila(datos, { ciudades: CIUDADES, rubros: RUBROS });

    expect(errores).toEqual([]);
  });

  it("una columna que no se parece a ninguna se anota como desconocida y el archivo se lee igual", async () => {
    const resultado = await analizar({
      encabezados: [...ENCABEZADOS_DE_GOOGLE_FORMS, "Edad", "Comentarios internos"],
      filas: [[...filaDeFormulario(), 30, "llamar el lunes"]],
    });

    expect(resultado.columnas.desconocidas).toEqual(["Edad", "Comentarios internos"]);
    expect(resultado.columnas.reconocidas).toHaveLength(11);
    expect(resultado.filas[0].estado).toBe("lista");
    expect(resultado.filas[0].avisos).toEqual([]);
  });

  it("un encabezado con una errata se lee como la columna esperada y se anota para que el Admin lo confirme", async () => {
    const encabezados = ENCABEZADOS_DE_GOOGLE_FORMS.map((h) => (h === "Ciudad" ? "Ciudd" : h));

    const resultado = await analizar({ encabezados, filas: [filaDeFormulario()] });

    expect(resultado.columnas.aproximadas).toEqual([{ encabezado: "Ciudd", columna: "Ciudad" }]);
    expect(resultado.columnas.obligatoriasAusentes).toEqual([]);
    expect(resultado.columnas.desconocidas).toEqual([]);
    expect(resultado.filas[0].datos.ciudadId).toBe(idDeCiudad("La Paz"));
    expect(resultado.filas[0].estado).toBe("lista");
  });

  it("la columna «Otra red social» llega a los datos de la fila", async () => {
    const resultado = await analizar({ filas: [filaDeFormulario({ otraRed: "TikTok @dulcesdeana" })] });

    expect(resultado.filas[0].datos.otraRedSocial).toBe("TikTok @dulcesdeana");
    expect(resultado.filas[0].textos).toEqual({ instagram: "@dulcesdeana", otraRed: "TikTok @dulcesdeana" });
    expect(resultado.filas[0].avisos).toEqual([]);
  });

  it("el orden de las columnas no importa", async () => {
    const orden = [12, 9, 3, 1, 5, 0, 2, 4, 6, 7, 8, 10, 11, 13];
    const resultado = await analizar({
      encabezados: orden.map((i) => ENCABEZADOS_DE_GOOGLE_FORMS[i]),
      filas: [orden.map((i) => filaDeFormulario()[i])],
    });

    expect(resultado.columnas).toMatchObject({ obligatoriasAusentes: [], desconocidas: [], aproximadas: [] });
    expect(resultado.filas[0].estado).toBe("lista");
    expect(resultado.filas[0].datos).toMatchObject({ correo: "ana.perez@ejemplo.com", ciudadId: idDeCiudad("La Paz") });
  });
});

describe("AnalizarExcelEmprendedorasUseCase: el archivo no es compatible", () => {
  it.each([
    ["datos.xls", MENSAJES_ARCHIVO.xls],
    ["datos.csv", MENSAJES_ARCHIVO.csv],
    ["~$datos.xlsx", MENSAJES_ARCHIVO.temporal],
  ])("%s se rechaza antes de abrirlo", async (nombre, mensaje) => {
    const { caso } = construir();

    expect(await mensajeDelRechazo(caso.ejecutar({ nombre, contenido: await crearExcelDePrueba({ filas: [filaDeFormulario()] }) }))).toBe(mensaje);
  });

  it("un archivo renombrado a .xlsx se rechaza como «no parece un Excel real»", async () => {
    const { caso } = construir();

    expect(await mensajeDelRechazo(caso.ejecutar({ nombre: "datos.xlsx", contenido: Buffer.from("hola, soy un texto") }))).toBe(MENSAJES_ARCHIVO.noEsExcel);
  });
});

describe("la plantilla de ejemplo se analiza sin problemas", () => {
  it("sus dos filas salen listas, usa las 11 columnas y solo ignora las 3 del formulario que no se guardan", async () => {
    const { caso } = construir();
    const contenido = await new GeneradorPlantillaExceljs().generar();

    const resultado = await caso.ejecutar({ nombre: "plantilla.xlsx", contenido });

    expect(resultado.resumen).toMatchObject({ total: 2, listas: 2, conError: 0, repetidas: 0 });
    expect(resultado.filas[0].datos).toMatchObject({ instagram: "dulcesdeana", otraRedSocial: "https://www.facebook.com/dulcesdeana" });
    expect(resultado.filas[1].datos).toMatchObject({ instagram: "", otraRedSocial: "", whatsapp: "+59160123456" });
    expect(resultado.columnas.reconocidas).toHaveLength(11);
    expect(resultado.columnas.ignoradas).toEqual([
      "Marca temporal",
      "¿Te gustaría ofrecer algo especial a las emprendedoras del Track de Mujeres 2026?",
      "Cuéntanos sobre tu beneficio",
    ]);
    expect(resultado.columnas).toMatchObject({ opcionalesAusentes: [], obligatoriasAusentes: [], desconocidas: [], aproximadas: [] });
  });

  it("la primera fila de la plantilla trae enlaces de ejemplo (que no abren nada) y la segunda no trae ninguno, sin avisos", async () => {
    const { caso } = construir();
    const contenido = await new GeneradorPlantillaExceljs().generar();

    const resultado = await caso.ejecutar({ nombre: "plantilla.xlsx", contenido });

    expect(resultado.filas[0].datos.fotoDriveId).toMatch(/^EJEMPLO_foto/);
    expect(resultado.filas[0].datos.logoDriveId).toMatch(/^EJEMPLO_logo/);
    expect(resultado.filas[1].datos).toMatchObject({ fotoDriveId: "", logoDriveId: "" });
    expect(resultado.filas[1].avisos.filter((a) => a.campo === "foto" || a.campo === "logo")).toEqual([]);
  });
});

describe("fotos y logos: enlaces de Drive (regla 22, 2026-10-09)", () => {
  const ID_FOTO = "1FotoDeLaEmprendedoraUnoAAAAAAAAAA";
  const ID_LOGO = "1LogoDeLaEmprendedoraUnoBBBBBBBBBB";

  it("de cada enlace solo se toma el id del archivo, con cualquiera de las formas de enlace de Drive", async () => {
    const resultado = await analizar({
      filas: [
        filaDeFormulario({ foto: `https://drive.google.com/open?id=${ID_FOTO}`, logo: `https://drive.google.com/file/d/${ID_LOGO}/view?usp=drive_link` }),
      ],
    });

    expect(resultado.filas[0].datos).toMatchObject({ fotoDriveId: ID_FOTO, logoDriveId: ID_LOGO });
    expect(resultado.filas[0].avisos).toEqual([]);
    expect(resultado.filas[0].estado).toBe("lista");
  });

  it("una celda vacía es «sin imagen»: ni id ni aviso", async () => {
    const resultado = await analizar({ filas: [filaDeFormulario({ foto: "", logo: null })] });

    expect(resultado.filas[0].datos).toMatchObject({ fotoDriveId: "", logoDriveId: "" });
    expect(resultado.filas[0].avisos).toEqual([]);
    expect(resultado.filas[0].estado).toBe("lista");
  });

  it("un enlace que no es un archivo de Drive es una advertencia (revisar), no un error: la fila sigue importable", async () => {
    const resultado = await analizar({
      filas: [filaDeFormulario({ foto: "la subo mañana", logo: `https://drive.google.com/drive/folders/${ID_LOGO}` })],
    });

    const [fila] = resultado.filas;
    expect(fila.datos).toMatchObject({ fotoDriveId: "", logoDriveId: "" });
    expect(fila.avisos.map((a) => [a.campo, a.codigo, a.severidad, a.reporte])).toEqual([
      ["foto", "foto_enlace_invalido", "revisar", true],
      ["logo", "logo_es_carpeta", "revisar", true],
    ]);
    expect(fila.estado).toBe("revisar");
    expect(fila.avisos[0].mensaje).toContain("súbela a mano");
  });

  it("un enlace que apunta a otro sitio (o a una dirección interna) nunca da un id", async () => {
    const resultado = await analizar({
      filas: [filaDeFormulario({ foto: `https://ejemplo.com/open?id=${ID_FOTO}`, logo: "http://169.254.169.254/latest/meta-data/" })],
    });

    expect(resultado.filas[0].datos).toMatchObject({ fotoDriveId: "", logoDriveId: "" });
    expect(resultado.filas[0].avisos.map((a) => a.codigo)).toEqual(["foto_enlace_invalido", "logo_enlace_invalido"]);
  });

  it("un archivo sin las columnas de foto y logo se lee igual y las dice como opcionales ausentes", async () => {
    const indices = ENCABEZADOS_DE_GOOGLE_FORMS.map((h, i) => [h, i] as const).filter(([h]) => !/Sube/.test(h)).map(([, i]) => i);
    const resultado = await analizar({
      encabezados: ENCABEZADOS_DE_GOOGLE_FORMS.filter((_, i) => indices.includes(i)),
      filas: [filaDeFormulario().filter((_, i) => indices.includes(i))],
    });

    expect(resultado.columnas.opcionalesAusentes).toEqual(["Foto de perfil", "Logo"]);
    expect(resultado.filas[0].estado).toBe("lista");
    expect(resultado.filas[0].datos).toMatchObject({ fotoDriveId: "", logoDriveId: "" });
  });
});
