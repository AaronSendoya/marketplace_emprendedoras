import { ErrorValidacion } from "@/shared/domain/errors";

// Regla 22: antes de abrir el archivo que subió el Admin se comprueba que de verdad sea un `.xlsx` razonable. Es la tercera
// capa (el navegador ya filtra las dos primeras) y no confía en nada de lo que declara el cliente: ni el nombre, ni el tipo.
// Los mensajes se repiten a propósito en `frontend/src/lib/importacion/mensajes.ts` (quien arrastra el archivo los ve antes,
// sin esperar al servidor): si se cambia uno, se cambia el otro.

export const TAMANO_MAXIMO_EXCEL_BYTES = 2 * 1024 * 1024;
// Un .xlsx es un ZIP: un archivo pequeño puede esconder cientos de MB de XML ("bomba"). Se suma el tamaño descomprimido de
// cada entrada leyendo solo el directorio del ZIP, sin descomprimir nada.
export const DESCOMPRIMIDO_MAXIMO_EXCEL_BYTES = 20 * 1024 * 1024;
const ENTRADAS_MAXIMAS = 2000;

const FIRMA_ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
// Excel antiguo (.xls) y también un .xlsx con contraseña (Excel lo guarda dentro de un contenedor de este tipo).
const FIRMA_OLE2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

const rechazar = (mensaje: string) => new ErrorValidacion(mensaje, [{ campo: "archivo", mensaje }]);

export const MENSAJES_ARCHIVO = {
  temporal:
    "Ese es un archivo temporal que Excel crea mientras el documento está abierto. Elige el archivo que tiene el mismo nombre pero sin ~$.",
  xls: "Este es un Excel antiguo (.xls). Ábrelo, elige Archivo > Guardar como > Libro de Excel (.xlsx) y vuelve a subirlo.",
  csv: "Los archivos .csv no se admiten. Ábrelo en Excel y guárdalo como Libro de Excel (.xlsx).",
  macros: "Los archivos con macros no se admiten. Guárdalo como Libro de Excel (.xlsx), sin macros.",
  googleSheets: "En Google Sheets elige Archivo > Descargar > Microsoft Excel (.xlsx) y sube ese archivo.",
  otroTipo: (extension: string) => `Solo se admiten archivos Excel (.xlsx). Elegiste un archivo${extension ? ` .${extension}` : " sin extensión"}.`,
  vacio: "El archivo está vacío. Revisa que sea el documento correcto.",
  muyGrande: (megabytes: string) =>
    `El archivo pesa ${megabytes} MB y el máximo es 2 MB. Si tiene imágenes pegadas, quítalas y vuelve a guardarlo.`,
  noEsExcel:
    "Este archivo no parece un Excel real: puede estar dañado o ser de otro tipo con la extensión cambiada. Ábrelo en Excel y guárdalo de nuevo como .xlsx.",
  conContrasena: "El archivo tiene contraseña. Quítala en Excel (Archivo > Información > Proteger libro) y súbelo de nuevo.",
  muyGrandePorDentro:
    "El archivo es demasiado pesado por dentro (descomprimido supera los 20 MB). Revisa que sea el documento correcto y que no tenga imágenes pegadas.",
  noSePudoLeer: "No pudimos leer el archivo. Ábrelo en Excel, guárdalo de nuevo como .xlsx e inténtalo otra vez.",
};

export interface InspeccionZip {
  entradas: number;
  bytesDescomprimidos: number;
  nombres: string[];
}

// Lee el directorio central del ZIP (al final del archivo). Devuelve `null` si no es un ZIP legible. No descomprime nada ni
// confía en nada más que en los límites del propio buffer.
export function inspeccionarZip(contenido: Buffer): InspeccionZip | null {
  const MINIMO_EOCD = 22;
  if (contenido.length < MINIMO_EOCD) return null;

  let eocd = -1;
  const limite = Math.max(0, contenido.length - MINIMO_EOCD - 0xffff);
  for (let i = contenido.length - MINIMO_EOCD; i >= limite; i--) {
    if (contenido.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const entradas = contenido.readUInt16LE(eocd + 10);
  const tamanoDirectorio = contenido.readUInt32LE(eocd + 12);
  const inicioDirectorio = contenido.readUInt32LE(eocd + 16);
  // ZIP64: un .xlsx de hasta 2 MB nunca lo necesita; si aparece es otra cosa.
  if (entradas === 0xffff || inicioDirectorio === 0xffffffff || tamanoDirectorio === 0xffffffff) return null;
  if (inicioDirectorio + tamanoDirectorio > eocd) return null;
  if (entradas > ENTRADAS_MAXIMAS) return { entradas, bytesDescomprimidos: 0, nombres: [] };

  const nombres: string[] = [];
  let bytesDescomprimidos = 0;
  let posicion = inicioDirectorio;
  for (let i = 0; i < entradas; i++) {
    if (posicion + 46 > eocd || contenido.readUInt32LE(posicion) !== 0x02014b50) return null;
    bytesDescomprimidos += contenido.readUInt32LE(posicion + 24);
    const largoNombre = contenido.readUInt16LE(posicion + 28);
    const largoExtra = contenido.readUInt16LE(posicion + 30);
    const largoComentario = contenido.readUInt16LE(posicion + 32);
    if (posicion + 46 + largoNombre > eocd) return null;
    nombres.push(contenido.toString("utf8", posicion + 46, posicion + 46 + largoNombre));
    posicion += 46 + largoNombre + largoExtra + largoComentario;
  }
  return { entradas, bytesDescomprimidos, nombres };
}

function nombreBase(nombre: string): string {
  return nombre.split(/[\\/]/).pop()?.trim() ?? "";
}

const extensionDe = (nombre: string) => (nombre.includes(".") ? (nombre.split(".").pop() ?? "").toLowerCase() : "");

// Lanza un ErrorValidacion con el mensaje situacional correspondiente si el archivo no sirve.
export function validarArchivoExcel(nombreEntrante: string, contenido: Buffer): void {
  const nombre = nombreBase(nombreEntrante);
  const extension = extensionDe(nombre);

  if (nombre.startsWith("~$")) throw rechazar(MENSAJES_ARCHIVO.temporal);
  if (extension === "xls") throw rechazar(MENSAJES_ARCHIVO.xls);
  if (extension === "csv") throw rechazar(MENSAJES_ARCHIVO.csv);
  if (extension === "xlsm" || extension === "xltm") throw rechazar(MENSAJES_ARCHIVO.macros);
  if (extension === "gsheet") throw rechazar(MENSAJES_ARCHIVO.googleSheets);
  if (extension !== "xlsx") throw rechazar(MENSAJES_ARCHIVO.otroTipo(extension));

  if (contenido.length === 0) throw rechazar(MENSAJES_ARCHIVO.vacio);
  if (contenido.length > TAMANO_MAXIMO_EXCEL_BYTES) {
    throw rechazar(MENSAJES_ARCHIVO.muyGrande((contenido.length / (1024 * 1024)).toFixed(1).replace(".", ",")));
  }

  if (contenido.subarray(0, FIRMA_OLE2.length).equals(FIRMA_OLE2)) throw rechazar(MENSAJES_ARCHIVO.conContrasena);
  if (!contenido.subarray(0, FIRMA_ZIP.length).equals(FIRMA_ZIP)) throw rechazar(MENSAJES_ARCHIVO.noEsExcel);

  const zip = inspeccionarZip(contenido);
  if (!zip) throw rechazar(MENSAJES_ARCHIVO.noEsExcel);
  if (zip.entradas > ENTRADAS_MAXIMAS || zip.bytesDescomprimidos > DESCOMPRIMIDO_MAXIMO_EXCEL_BYTES) throw rechazar(MENSAJES_ARCHIVO.muyGrandePorDentro);
  if (!zip.nombres.includes("[Content_Types].xml") || !zip.nombres.includes("xl/workbook.xml")) throw rechazar(MENSAJES_ARCHIVO.noEsExcel);
  if (zip.nombres.some((entrada) => entrada.toLowerCase() === "xl/vbaproject.bin")) throw rechazar(MENSAJES_ARCHIVO.macros);
}
