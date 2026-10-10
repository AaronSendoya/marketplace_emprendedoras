import type { TipoImagen } from "./imagenes";

export interface OpcionesDeProcesado {
  // Cuánto puede pesar la entrada. Sin indicarlo, el tope de siempre (regla 16); la importación desde Drive pide uno mayor.
  tamanoMaxBytes?: number;
}

// Puerto de procesamiento (regla 16). Lanza ErrorArchivoMuyGrande o ErrorValidacion; devuelve un WebP.
export interface IImageProcessor {
  procesar(entrada: Buffer, tipo: TipoImagen, opciones?: OpcionesDeProcesado): Promise<Buffer>;
}
