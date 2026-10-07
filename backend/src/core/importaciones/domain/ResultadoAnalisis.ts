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
  // Lo que decía el Excel en lo que no se guarda tal cual: para el reporte "por revisar".
  textos: { instagram: string };
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
  };
  filas: FilaAnalizada[];
  resumen: ResumenAnalisis;
}
