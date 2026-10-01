import type { TipoImagen } from "./imagenes";

// Puerto de procesamiento (regla 16). Lanza ErrorArchivoMuyGrande o ErrorValidacion; devuelve un WebP.
export interface IImageProcessor {
  procesar(entrada: Buffer, tipo: TipoImagen): Promise<Buffer>;
}
