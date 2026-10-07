import ExcelJS from "exceljs";
import { ErrorValidacion } from "@/shared/domain/errors";
import { MENSAJES_ARCHIVO } from "../domain/ArchivoExcel";
import type { FilaLeida, HojaLeida, ILectorExcel, LibroLeido } from "../domain/ILectorExcel";

// Regla 22: el único sitio que conoce `exceljs`. Lee los valores de las celdas (nunca evalúa fórmulas ni ejecuta nada: un `.xlsx`
// sin macros es solo datos) y los entrega como texto, con las filas ocultas marcadas.

// No se lee más de lo necesario: el tope de filas lo decide el caso de uso, esto solo evita cargar hojas enormes.
const MAXIMO_DE_HOJAS = 20;
const MAXIMO_DE_FILAS_LEIDAS = 2000;
const MAXIMO_DE_COLUMNAS = 60;

// Los números llegan como número de Excel: un celular guardado como número se ve en el archivo como `7.1578947E7`, pero aquí ya
// es el entero 71578947 y `String` no usa notación científica por debajo de 1e21.
function comoTexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : "";
  if (typeof valor === "boolean") return valor ? "true" : "false";
  if (valor instanceof Date) return valor.toISOString();
  if ("richText" in valor) return valor.richText.map((trozo) => trozo.text).join("").trim();
  if ("result" in valor) return comoTexto(valor.result as ExcelJS.CellValue);
  if ("text" in valor) return typeof valor.text === "string" ? valor.text.trim() : comoTexto(valor.text as ExcelJS.CellValue);
  return "";
}

export class LectorExcelExceljs implements ILectorExcel {
  async leer(contenido: Buffer): Promise<LibroLeido> {
    const libro = new ExcelJS.Workbook();
    try {
      await libro.xlsx.load(contenido as unknown as ArrayBuffer);
    } catch {
      throw new ErrorValidacion(MENSAJES_ARCHIVO.noSePudoLeer, [{ campo: "archivo", mensaje: MENSAJES_ARCHIVO.noSePudoLeer }]);
    }

    const hojas: HojaLeida[] = [];
    libro.eachSheet((hoja) => {
      if (hojas.length >= MAXIMO_DE_HOJAS) return;
      const filas: FilaLeida[] = [];
      hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
        if (filas.length >= MAXIMO_DE_FILAS_LEIDAS) return;
        const celdas: string[] = [];
        fila.eachCell({ includeEmpty: true }, (celda, columna) => {
          if (columna <= MAXIMO_DE_COLUMNAS) celdas[columna - 1] = comoTexto(celda.value);
        });
        const completas = Array.from(celdas, (celda) => celda ?? "");
        if (completas.every((celda) => celda === "")) return;
        filas.push({ numero, oculta: fila.hidden === true, celdas: completas });
      });
      hojas.push({ nombre: hoja.name, filas });
    });
    return { hojas };
  }
}
