import ExcelJS from "exceljs";
import { ENCABEZADOS_DEL_FORMULARIO, detectarEncabezados, type ClaveColumna } from "../domain/ColumnasExcel";
import type { IGeneradorPlantilla } from "../domain/ILectorExcel";

// Regla 22: el `.xlsx` de ejemplo que se descarga desde la pantalla de importación: los 14 encabezados tal como los trae el
// formulario de Google Forms (con las columnas que la importación ignora) y dos filas inventadas (ninguna persona real) que
// muestran el formato esperado. Los enlaces de Drive de la foto y del logo son inventados: no abren ningún archivo. Se lee de vuelta por el mismo análisis, así que si cambia una columna, la plantilla cambia con ella.

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
    otraRed: "https://www.facebook.com/dulcesdeana",
    foto: "https://drive.google.com/open?id=EJEMPLO_foto_de_ana_perez_000000",
    logo: "https://drive.google.com/open?id=EJEMPLO_logo_de_ana_perez_000000",
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
    otraRed: "",
    // Sin enlaces: el perfil quedará con las imágenes predeterminadas, sin ningún aviso.
    foto: "",
    logo: "",
  },
];

// La marca temporal es lo único de las columnas que se ignoran que vale la pena mostrar; las del beneficio van vacías para que quede
// claro que no se usan.
const MARCAS_TEMPORALES = ["07/10/2026 14:32:10", "07/10/2026 15:05:41"];

const ANCHOS: Record<ClaveColumna, number> = {
  correo: 32,
  nombreCompleto: 28,
  whatsapp: 18,
  ciudad: 16,
  emprendimiento: 28,
  descripcion: 48,
  rubro: 34,
  instagram: 26,
  otraRed: 30,
  foto: 40,
  logo: 40,
};
const ANCHO_DE_LAS_IGNORADAS = 22;

const COLOR_DE_LAS_USADAS = "FF7C3AED";
const COLOR_DE_LAS_IGNORADAS = "FF78716C";

export class GeneradorPlantillaExceljs implements IGeneradorPlantilla {
  async generar(): Promise<Buffer> {
    // Qué columna del formulario es cada posición: las que no tienen clave son las que se ignoran.
    const claveDe = new Map<number, ClaveColumna>(
      (Object.entries(detectarEncabezados(ENCABEZADOS_DEL_FORMULARIO).columnas) as [ClaveColumna, number][]).map(([clave, indice]) => [indice, clave]),
    );

    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Respuestas de formulario 1");
    hoja.columns = ENCABEZADOS_DEL_FORMULARIO.map((encabezado, indice) => {
      const clave = claveDe.get(indice);
      return { header: encabezado, key: `columna${indice}`, width: clave ? ANCHOS[clave] : ANCHO_DE_LAS_IGNORADAS };
    });
    EJEMPLOS.forEach((ejemplo, fila) => {
      hoja.addRow(
        ENCABEZADOS_DEL_FORMULARIO.map((_, indice) => {
          const clave = claveDe.get(indice);
          if (clave) return ejemplo[clave];
          return indice === 0 ? MARCAS_TEMPORALES[fila] : "";
        }),
      );
    });

    const encabezado = hoja.getRow(1);
    encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
    encabezado.alignment = { vertical: "middle", wrapText: true };
    encabezado.height = 36;
    ENCABEZADOS_DEL_FORMULARIO.forEach((_, indice) => {
      encabezado.getCell(indice + 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: claveDe.has(indice) ? COLOR_DE_LAS_USADAS : COLOR_DE_LAS_IGNORADAS },
      };
    });
    hoja.views = [{ state: "frozen", ySplit: 1 }];

    return Buffer.from(await libro.xlsx.writeBuffer());
  }
}
