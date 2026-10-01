import sharp from "sharp";
import { ErrorArchivoMuyGrande, ErrorDeDominio, ErrorValidacion } from "@/shared/domain/errors";
import type { IImageProcessor } from "@/shared/domain/IImageProcessor";
import { CALIDAD_WEBP, LADO_MAX_PX, TAMANO_MAX_IMAGEN_BYTES, type TipoImagen } from "@/shared/domain/imagenes";

const FORMATOS_ACEPTADOS = new Set(["jpeg", "png", "webp"]);
const MENSAJE_FORMATO = "El archivo debe ser una imagen JPEG, PNG o WebP válida.";
// Frena las imágenes "bomba" (poco peso, decenas de miles de píxeles) antes de decodificarlas.
const MAX_PIXELES_ENTRADA = 50_000_000;

export class ImageProcessorService implements IImageProcessor {
  async procesar(entrada: Buffer, tipo: TipoImagen): Promise<Buffer> {
    if (entrada.length > TAMANO_MAX_IMAGEN_BYTES) throw new ErrorArchivoMuyGrande();
    if (entrada.length === 0) throw new ErrorValidacion(MENSAJE_FORMATO);

    try {
      const imagen = sharp(entrada, { failOn: "error", limitInputPixels: MAX_PIXELES_ENTRADA });
      // El tipo se lee del contenido, no del nombre ni del Content-Type que declara el cliente.
      const { format } = await imagen.metadata();
      if (!format || !FORMATOS_ACEPTADOS.has(format)) throw new ErrorValidacion(MENSAJE_FORMATO);

      // rotate() aplica la orientación EXIF; sharp no copia los metadatos (EXIF, GPS) a la salida.
      return await imagen
        .rotate()
        .resize({ width: LADO_MAX_PX[tipo], height: LADO_MAX_PX[tipo], fit: "inside", withoutEnlargement: true })
        .webp({ quality: CALIDAD_WEBP })
        .toBuffer();
    } catch (error) {
      if (error instanceof ErrorDeDominio) throw error;
      throw new ErrorValidacion(MENSAJE_FORMATO);
    }
  }
}
