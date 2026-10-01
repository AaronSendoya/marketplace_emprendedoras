// Puerto de almacenamiento de imágenes (regla 16). La base guarda solo la clave.
export interface IImageStorage {
  // Guarda un WebP ya procesado con caché inmutable.
  guardar(clave: string, contenido: Buffer): Promise<void>;
  // Borrar una clave que no existe no es un error.
  borrar(clave: string): Promise<void>;
  urlPublica(clave: string): string;
}
