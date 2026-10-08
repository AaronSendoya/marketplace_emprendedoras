import type { Aviso } from "./Avisos";
import type { DatosFila } from "./FilaImportacion";

// `repetida` y `ya_existe` nunca se importan: el correo ya aparece antes en el archivo o ya tiene cuenta.
export type EstadoFila = "lista" | "revisar" | "error" | "ya_existe" | "repetida";

export interface FilaAnalizada {
  // Número de fila en el Excel, para que el Admin la encuentre.
  fila: number;
  oculta: boolean;
  estado: EstadoFila;
  datos: DatosFila;
  avisos: Aviso[];
  yaExiste: boolean;
  repetidaDe: number | null;
  // Lo que decían el Excel en Instagram y en «otra red social»: para el reporte "por revisar".
  textos: { instagram: string; otraRed: string };
}

export interface ResumenAnalisis {
  total: number;
  listas: number;
  revisar: number;
  conError: number;
  yaExisten: number;
  repetidas: number;
  ocultas: number;
}

export interface ResultadoAnalisis {
  // La hoja que se leyó y todas las que tiene el libro.
  hoja: string;
  hojas: string[];
  columnas: {
    reconocidas: string[];
    // Columnas que el formulario trae y no se usan a propósito (fotos, logo, marca temporal, beneficio).
    ignoradas: string[];
    // Columnas opcionales que el archivo no trae (la fila se importa sin ese dato).
    opcionalesAusentes: string[];
    // Columnas obligatorias que el archivo no trae: el archivo se acepta igual y cada fila queda con el error de ese dato, que el
    // Admin completa en la vista previa (regla 22, «Tolerancia con el formato»).
    obligatoriasAusentes: string[];
    // Encabezados que no se parecen a ninguna columna esperada: no se usan.
    desconocidas: string[];
    // Encabezados que se leyeron como una columna esperada por parecerse a ella; el Admin lo confirma.
    aproximadas: { encabezado: string; columna: string }[];
  };
  filas: FilaAnalizada[];
  resumen: ResumenAnalisis;
}
