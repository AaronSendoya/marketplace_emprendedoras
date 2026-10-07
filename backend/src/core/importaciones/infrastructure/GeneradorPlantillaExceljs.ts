import ExcelJS from "exceljs";
import { COLUMNAS, type ClaveColumna } from "../domain/ColumnasExcel";
import type { IGeneradorPlantilla } from "../domain/ILectorExcel";

// Regla 22: el `.xlsx` de ejemplo que se descarga desde la pantalla de importación: los encabezados tal como los trae el
// formulario de Google Forms y dos filas inventadas (ninguna persona real) que muestran el formato esperado. Se lee de vuelta
// por el mismo análisis, así que si cambia una columna, la plantilla cambia con ella.

type FilaDeEjemplo = Record<ClaveColumna, string | number>;

// El WhatsApp va como número, igual que lo guarda Excel cuando alguien lo escribe sin comillas.
const EJEMPLOS: FilaDeEjemplo[] = [
  {
    correo: "ana.perez@ejemplo.com",
    nombreCompleto: "Ana María Pérez Rojas",
    whatsapp: 71234567,
    ciudad: "La Paz",
    emprendimiento: "Dulces de Ana",
    descripcion: "Postres caseros y tortas por encargo, hechos con ingredientes locales.",
    rubro: "Alimentos y bebidas",
    instagram: "@dulcesdeana",
  },
  {
    correo: "lucia.vargas@ejemplo.com",
    nombreCompleto: "Lucía Fernanda Vargas Mendoza",
    whatsapp: 60123456,
    ciudad: "Cochabamba",
    emprendimiento: "Tejidos Wayra",
    descripcion: "Prendas tejidas a mano con lana de alpaca.",
    rubro: "Artesanías o productos hechos a mano",
    instagram: "No tengo",
  },
];

const ANCHOS: Record<ClaveColumna, number> = {
  correo: 32,
  nombreCompleto: 28,
  whatsapp: 18,
  ciudad: 16,
  emprendimiento: 28,
  descripcion: 48,
  rubro: 34,
  instagram: 26,
};

export class GeneradorPlantillaExceljs implements IGeneradorPlantilla {
  async generar(): Promise<Buffer> {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Respuestas de formulario 1");
    hoja.columns = COLUMNAS.map((columna) => ({ header: columna.encabezado, key: columna.clave, width: ANCHOS[columna.clave] }));
    for (const ejemplo of EJEMPLOS) hoja.addRow(ejemplo);

    const encabezado = hoja.getRow(1);
    encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
    encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
    encabezado.alignment = { vertical: "middle", wrapText: true };
    encabezado.height = 36;
    hoja.views = [{ state: "frozen", ySplit: 1 }];

    return Buffer.from(await libro.xlsx.writeBuffer());
  }
}
