import type { IImageStorage } from "@/shared/domain/IImageStorage";

// Para pruebas y para desarrollo sin R2: las imágenes viven en memoria y se pierden al reiniciar.
// Sus URLs no se pueden abrir en un navegador.
export class ImageStorageEnMemoria implements IImageStorage {
  private readonly archivos = new Map<string, Buffer>();

  async guardar(clave: string, contenido: Buffer): Promise<void> {
    this.archivos.set(clave, contenido);
  }

  async borrar(clave: string): Promise<void> {
    this.archivos.delete(clave);
  }

  urlPublica(clave: string): string {
    return `memoria://${clave}`;
  }

  existe(clave: string): boolean {
    return this.archivos.has(clave);
  }

  claves(): string[] {
    return [...this.archivos.keys()];
  }
}
