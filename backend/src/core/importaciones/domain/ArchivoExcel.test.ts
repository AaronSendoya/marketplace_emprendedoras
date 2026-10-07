import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/shared/domain/errors";
import { crearExcelDePrueba, filaDeFormulario } from "../testing/dobles";
import {
  DESCOMPRIMIDO_MAXIMO_EXCEL_BYTES,
  MENSAJES_ARCHIVO,
  TAMANO_MAXIMO_EXCEL_BYTES,
  inspeccionarZip,
  validarArchivoExcel,
} from "./ArchivoExcel";

// Un ZIP mínimo con solo lo que el inspector lee: las cabeceras locales y el directorio central. Los tamaños descomprimidos se
// declaran sin que haya datos: así se prueba una "bomba" sin fabricar cientos de megabytes.
function zip(entradas: { nombre: string; descomprimido?: number }[]): Buffer {
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let desplazamiento = 0;
  for (const entrada of entradas) {
    const nombre = Buffer.from(entrada.nombre);
    const local = Buffer.alloc(30 + nombre.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(nombre.length, 26);
    nombre.copy(local, 30);
    const central = Buffer.alloc(46 + nombre.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(entrada.descomprimido ?? 0, 24);
    central.writeUInt16LE(nombre.length, 28);
    central.writeUInt32LE(desplazamiento, 42);
    nombre.copy(central, 46);
    locales.push(local);
    centrales.push(central);
    desplazamiento += local.length;
  }
  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, directorio, fin]);
}

const ENTRADAS_DE_EXCEL = [{ nombre: "[Content_Types].xml" }, { nombre: "xl/workbook.xml" }, { nombre: "xl/worksheets/sheet1.xml", descomprimido: 5000 }];
const mensajeDe = (accion: () => void) => {
  try {
    accion();
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles?.[0].campo).toBe("archivo");
    return (error as ErrorValidacion).message;
  }
  throw new Error("Debía rechazar el archivo");
};

describe("inspeccionarZip", () => {
  it("lee los nombres y suma el tamaño descomprimido sin descomprimir nada", () => {
    expect(inspeccionarZip(zip(ENTRADAS_DE_EXCEL))).toEqual({
      entradas: 3,
      bytesDescomprimidos: 5000,
      nombres: ["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"],
    });
  });

  it("lee un .xlsx real, escrito por la librería (la prueba de que sirve con archivos de verdad)", async () => {
    const real = await crearExcelDePrueba({ filas: [filaDeFormulario()] });

    const inspeccion = inspeccionarZip(real);

    expect(inspeccion?.nombres).toEqual(expect.arrayContaining(["[Content_Types].xml", "xl/workbook.xml"]));
  });

  it.each([
    ["bytes cualquiera", Buffer.from("esto no es un zip, ni de lejos, ni cerca")],
    ["un buffer demasiado corto", Buffer.from("PK")],
    ["un ZIP cortado al final", zip(ENTRADAS_DE_EXCEL).subarray(0, -5)],
  ])("%s: no es un ZIP legible", (_nombre, contenido) => {
    expect(inspeccionarZip(contenido)).toBeNull();
  });

  it("un directorio que dice tener más entradas de las que hay no es legible", () => {
    const valido = zip(ENTRADAS_DE_EXCEL);
    valido.writeUInt16LE(9, valido.length - 22 + 10);

    expect(inspeccionarZip(valido)).toBeNull();
  });

  it("un directorio que apunta fuera del archivo no es legible", () => {
    const valido = zip(ENTRADAS_DE_EXCEL);
    valido.writeUInt32LE(valido.length + 1000, valido.length - 22 + 16);

    expect(inspeccionarZip(valido)).toBeNull();
  });

  it("un ZIP64 no es legible (un .xlsx de hasta 2 MB nunca lo necesita)", () => {
    const valido = zip(ENTRADAS_DE_EXCEL);
    valido.writeUInt16LE(0xffff, valido.length - 22 + 10);

    expect(inspeccionarZip(valido)).toBeNull();
  });
});

describe("validarArchivoExcel (regla 22): mensajes situacionales", () => {
  const bueno = zip(ENTRADAS_DE_EXCEL);

  it("acepta un .xlsx bien formado, también con la extensión en mayúsculas y con la ruta completa", async () => {
    const real = await crearExcelDePrueba({ filas: [filaDeFormulario()] });

    expect(() => validarArchivoExcel("emprendedoras.xlsx", real)).not.toThrow();
    expect(() => validarArchivoExcel("C:\\Users\\Ana\\Descargas\\Emprendedoras.XLSX", real)).not.toThrow();
    expect(() => validarArchivoExcel("emprendedoras.xlsx", bueno)).not.toThrow();
  });

  it("un archivo temporal de Excel (~$)", () => {
    expect(mensajeDe(() => validarArchivoExcel("~$Comunidad de Emprendedoras.xlsx", Buffer.alloc(165)))).toBe(MENSAJES_ARCHIVO.temporal);
    expect(mensajeDe(() => validarArchivoExcel("C:\\Descargas\\~$Libro.xlsx", bueno))).toBe(MENSAJES_ARCHIVO.temporal);
  });

  it.each([
    ["datos.xls", MENSAJES_ARCHIVO.xls],
    ["datos.csv", MENSAJES_ARCHIVO.csv],
    ["datos.xlsm", MENSAJES_ARCHIVO.macros],
    ["datos.gsheet", MENSAJES_ARCHIVO.googleSheets],
    ["informe.pdf", MENSAJES_ARCHIVO.otroTipo("pdf")],
    ["foto.JPG", MENSAJES_ARCHIVO.otroTipo("jpg")],
    ["sin-extension", MENSAJES_ARCHIVO.otroTipo("")],
  ])("%s se rechaza por su extensión", (nombre, mensaje) => {
    expect(mensajeDe(() => validarArchivoExcel(nombre, bueno))).toBe(mensaje);
  });

  it("el mensaje de otro tipo nombra el tipo que se eligió", () => {
    expect(MENSAJES_ARCHIVO.otroTipo("pdf")).toBe("Solo se admiten archivos Excel (.xlsx). Elegiste un archivo .pdf.");
    expect(MENSAJES_ARCHIVO.otroTipo("")).toContain("sin extensión");
  });

  it("un archivo vacío", () => {
    expect(mensajeDe(() => validarArchivoExcel("datos.xlsx", Buffer.alloc(0)))).toBe(MENSAJES_ARCHIVO.vacio);
  });

  it("un archivo de más de 2 MB, con su peso en el mensaje", () => {
    const mensaje = mensajeDe(() => validarArchivoExcel("datos.xlsx", Buffer.alloc(TAMANO_MAXIMO_EXCEL_BYTES + 1)));

    expect(mensaje).toBe(MENSAJES_ARCHIVO.muyGrande("2,0"));
    expect(mensaje).toContain("2 MB");
  });

  it("un archivo de exactamente 2 MB todavía entra en la revisión del contenido", () => {
    expect(mensajeDe(() => validarArchivoExcel("datos.xlsx", Buffer.alloc(TAMANO_MAXIMO_EXCEL_BYTES)))).toBe(MENSAJES_ARCHIVO.noEsExcel);
  });

  it("un .xlsx con contraseña (contenedor antiguo de Office) se dice con claridad", () => {
    const protegido = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(512)]);

    expect(mensajeDe(() => validarArchivoExcel("datos.xlsx", protegido))).toBe(MENSAJES_ARCHIVO.conContrasena);
  });

  it.each([
    ["bytes cualquiera con extensión .xlsx", Buffer.from("no soy un excel, solo me renombraron".repeat(10))],
    ["un ZIP que no es un libro de Excel", zip([{ nombre: "foto.jpg" }, { nombre: "notas.txt" }])],
    ["un ZIP al que le falta el libro", zip([{ nombre: "[Content_Types].xml" }])],
    ["un ZIP cortado a la mitad", bueno.subarray(0, 40)],
  ])("%s: no parece un Excel real", (_nombre, contenido) => {
    expect(mensajeDe(() => validarArchivoExcel("datos.xlsx", contenido))).toBe(MENSAJES_ARCHIVO.noEsExcel);
  });

  it("un libro con macros (aunque se llame .xlsx)", () => {
    const conMacros = zip([...ENTRADAS_DE_EXCEL, { nombre: "xl/vbaProject.bin" }]);

    expect(mensajeDe(() => validarArchivoExcel("datos.xlsx", conMacros))).toBe(MENSAJES_ARCHIVO.macros);
  });

  it("una «bomba»: pesa poco comprimida pero descomprimida pasa de 20 MB", () => {
    const bomba = zip([...ENTRADAS_DE_EXCEL, { nombre: "xl/worksheets/enorme.xml", descomprimido: DESCOMPRIMIDO_MAXIMO_EXCEL_BYTES + 1 }]);

    expect(mensajeDe(() => validarArchivoExcel("datos.xlsx", bomba))).toBe(MENSAJES_ARCHIVO.muyGrandePorDentro);
  });

  it("una «bomba» con miles de entradas", () => {
    const muchas = zip(Array.from({ length: 2001 }, (_, i) => ({ nombre: `xl/parte${i}.xml` })));

    expect(mensajeDe(() => validarArchivoExcel("datos.xlsx", muchas))).toBe(MENSAJES_ARCHIVO.muyGrandePorDentro);
  });

  it("la suma del tamaño descomprimido cuenta todas las entradas, no solo la más grande", () => {
    const repartida = zip([...ENTRADAS_DE_EXCEL, ...Array.from({ length: 4 }, (_, i) => ({ nombre: `xl/parte${i}.xml`, descomprimido: 6 * 1024 * 1024 }))]);

    expect(mensajeDe(() => validarArchivoExcel("datos.xlsx", repartida))).toBe(MENSAJES_ARCHIVO.muyGrandePorDentro);
  });
});
