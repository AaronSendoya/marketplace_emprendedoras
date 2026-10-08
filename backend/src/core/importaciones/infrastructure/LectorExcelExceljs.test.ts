import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { MENSAJES_ARCHIVO } from "../domain/ArchivoExcel";
import { ENCABEZADOS_DE_GOOGLE_FORMS, crearExcelDePrueba, filaDeFormulario } from "../testing/dobles";
import { GeneradorPlantillaExceljs } from "./GeneradorPlantillaExceljs";
import { LectorExcelExceljs } from "./LectorExcelExceljs";

const lector = new LectorExcelExceljs();

describe("LectorExcelExceljs", () => {
  it("lee los encabezados y las filas como texto, con el número de fila de Excel", async () => {
    const libro = await lector.leer(await crearExcelDePrueba({ filas: [filaDeFormulario(), filaDeFormulario({ correo: "otra@ejemplo.com" })] }));

    expect(libro.hojas).toHaveLength(1);
    const { nombre, filas } = libro.hojas[0];
    expect(nombre).toBe("Respuestas de formulario 1");
    expect(filas.map((f) => f.numero)).toEqual([1, 2, 3]);
    expect(filas[0].celdas[1]).toBe("Dirección de correo electrónico");
    expect(filas[1].celdas[1]).toBe("ana.perez@ejemplo.com");
    expect(filas[2].celdas[1]).toBe("otra@ejemplo.com");
  });

  it("un celular guardado como número en Excel (7.1578947E7) llega como el entero «71578947», sin notación científica", async () => {
    const libro = await lector.leer(await crearExcelDePrueba({ filas: [filaDeFormulario({ whatsapp: 7.1578947e7 }), filaDeFormulario({ whatsapp: 6.01234e7 })] }));

    expect(libro.hojas[0].filas[1].celdas[3]).toBe("71578947");
    expect(libro.hojas[0].filas[2].celdas[3]).toBe("60123400");
  });

  it("un número con texto («+591…») llega tal cual", async () => {
    const libro = await lector.leer(await crearExcelDePrueba({ filas: [filaDeFormulario({ whatsapp: "+59171234567" })] }));

    expect(libro.hojas[0].filas[1].celdas[3]).toBe("+59171234567");
  });

  it("marca las filas ocultas (por ejemplo, por un filtro) y deja visibles las demás", async () => {
    const libro = await lector.leer(await crearExcelDePrueba({ filas: [filaDeFormulario(), filaDeFormulario(), filaDeFormulario()], ocultas: [3] }));

    expect(libro.hojas[0].filas.map((f) => [f.numero, f.oculta])).toEqual([
      [1, false],
      [2, false],
      [3, true],
      [4, false],
    ]);
  });

  it("lee todas las hojas, en orden", async () => {
    const libro = await lector.leer(
      await crearExcelDePrueba({ filas: [filaDeFormulario()], otrasHojas: [{ nombre: "Notas", filas: [["Hola", "mundo"]] }] }),
    );

    expect(libro.hojas.map((h) => h.nombre)).toEqual(["Respuestas de formulario 1", "Notas"]);
    expect(libro.hojas[1].filas[0].celdas).toEqual(["Hola", "mundo"]);
  });

  it("salta las filas sin nada escrito y rellena con texto vacío las celdas que faltan", async () => {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Hoja");
    hoja.getCell("A1").value = "primero";
    hoja.getCell("C1").value = "tercero";
    hoja.getCell("A3").value = "";
    hoja.getCell("B5").value = "solo la B";

    const leido = await lector.leer(Buffer.from(await libro.xlsx.writeBuffer()));

    expect(leido.hojas[0].filas).toEqual([
      { numero: 1, oculta: false, celdas: ["primero", "", "tercero"] },
      { numero: 5, oculta: false, celdas: ["", "solo la B"] },
    ]);
  });

  it("entiende texto con formato, enlaces, fórmulas, fechas y booleanos", async () => {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Hoja");
    hoja.getCell("A1").value = { richText: [{ text: "Hola " }, { text: "mundo", font: { bold: true } }] };
    hoja.getCell("B1").value = { text: "mi sitio", hyperlink: "https://ejemplo.com" };
    hoja.getCell("C1").value = { formula: "1+1", result: 2 };
    hoja.getCell("D1").value = new Date("2026-09-16T13:23:55Z");
    hoja.getCell("E1").value = true;
    hoja.getCell("F1").value = "  con espacios  ";

    const [fila] = (await lector.leer(Buffer.from(await libro.xlsx.writeBuffer()))).hojas[0].filas;

    expect(fila.celdas).toEqual(["Hola mundo", "mi sitio", "2", "2026-09-16T13:23:55.000Z", "true", "con espacios"]);
  });

  it("no ejecuta ni evalúa nada: una fórmula sin resultado guardado queda vacía", async () => {
    const libro = new ExcelJS.Workbook();
    libro.addWorksheet("Hoja").getCell("A1").value = { formula: "HYPERLINK(\"http://malo.example\",\"x\")" } as ExcelJS.CellFormulaValue;

    const leido = await lector.leer(Buffer.from(await libro.xlsx.writeBuffer()));

    expect(leido.hojas[0].filas).toEqual([]);
  });

  it("un libro sin ninguna fila devuelve hojas sin filas, no falla", async () => {
    const libro = new ExcelJS.Workbook();
    libro.addWorksheet("Vacía");

    expect((await lector.leer(Buffer.from(await libro.xlsx.writeBuffer()))).hojas).toEqual([{ nombre: "Vacía", filas: [] }]);
  });

  it("un archivo que parece un ZIP pero no es un libro se rechaza con un mensaje claro", async () => {
    const basura = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(200, 7)]);

    await expect(lector.leer(basura)).rejects.toBeInstanceOf(ErrorValidacion);
    await expect(lector.leer(basura)).rejects.toMatchObject({ message: MENSAJES_ARCHIVO.noSePudoLeer });
  });
});

describe("GeneradorPlantillaExceljs", () => {
  it("genera un .xlsx que se lee de vuelta, con los 14 encabezados de Google Forms exactos y en su orden, y dos filas de ejemplo inventadas", async () => {
    const libro = await lector.leer(await new GeneradorPlantillaExceljs().generar());

    const [encabezado, uno, dos] = libro.hojas[0].filas;
    expect(libro.hojas[0].filas).toHaveLength(3);
    expect(encabezado.celdas).toEqual(ENCABEZADOS_DE_GOOGLE_FORMS.map((e) => e.trim()));
    expect(uno.celdas).toContain("ana.perez@ejemplo.com");
    expect(uno.celdas).toContain("71234567");
    expect(uno.celdas).toContain("https://www.facebook.com/dulcesdeana");
    expect(dos.celdas).toContain("lucia.vargas@ejemplo.com");
  });

  it("el último encabezado conserva su espacio final, tal como sale de Google Forms", async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await new GeneradorPlantillaExceljs().generar()) as unknown as ArrayBuffer);

    expect(libro.worksheets[0].getRow(1).getCell(14).value).toBe("Cuéntanos sobre tu beneficio ");
  });
});
