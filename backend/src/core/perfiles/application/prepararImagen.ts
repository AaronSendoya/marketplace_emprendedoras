import type { IImageProcessor } from "@/shared/domain/IImageProcessor";
import {
  CLAVE_FOTO_PERFIL_PREDETERMINADA,
  CLAVE_LOGO_PREDETERMINADO,
  nuevaClaveImagen,
  type ImagenEntrante,
} from "@/shared/domain/imagenes";

export interface ImagenPreparada {
  clave: string;
  // Nulo si es una imagen predeterminada: ya está en el almacenamiento y no se sube (regla 11).
  contenido: Buffer | null;
}

// Procesa el archivo (regla 16) o elige la imagen predeterminada pedida de forma explícita (regla 11).
// Todavía no sube nada: así, si la segunda imagen falla, la primera no queda huérfana.
export async function prepararImagen(
  procesador: IImageProcessor,
  imagen: ImagenEntrante,
  tipo: "perfil" | "logo",
): Promise<ImagenPreparada> {
  if (imagen === "predeterminada") {
    return { clave: tipo === "perfil" ? CLAVE_FOTO_PERFIL_PREDETERMINADA : CLAVE_LOGO_PREDETERMINADO, contenido: null };
  }
  // Ya pasó por el proceso de la regla 16 (quien llama lo hizo para saber si servía): se guarda tal cual.
  if (!Buffer.isBuffer(imagen)) return { clave: nuevaClaveImagen(tipo), contenido: imagen.yaProcesada };
  return { clave: nuevaClaveImagen(tipo), contenido: await procesador.procesar(imagen, tipo) };
}
