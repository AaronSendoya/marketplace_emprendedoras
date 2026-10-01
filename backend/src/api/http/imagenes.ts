import { ErrorValidacion } from "@/shared/domain/errors";
import type { ImagenEntrante } from "@/shared/domain/imagenes";

// Regla 11: la imagen predeterminada se pide de forma explícita, nunca por omisión silenciosa. Cada
// imagen llega como archivo o con la marca de la predeterminada, una de las dos.
export function resolverImagen(
  archivo: Buffer | undefined,
  usarPredeterminada: boolean | undefined,
  campoArchivo: string,
  campoMarca: string,
): ImagenEntrante {
  const error = (mensaje: string) => new ErrorValidacion(mensaje, [{ campo: campoArchivo, mensaje }]);
  if (archivo && usarPredeterminada) throw error(`Envía el archivo o ${campoMarca}=true, no ambos.`);
  if (archivo) return archivo;
  if (usarPredeterminada) return "predeterminada";
  throw error(`Falta la imagen: envía el archivo o ${campoMarca}=true para usar la predeterminada.`);
}

// Imagen obligatoria sin predeterminada (los productos, regla 7).
export function exigirImagen(archivo: Buffer | undefined, campo: string): Buffer {
  if (archivo) return archivo;
  const mensaje = `Falta la imagen: envía el archivo en el campo ${campo}.`;
  throw new ErrorValidacion(mensaje, [{ campo, mensaje }]);
}
