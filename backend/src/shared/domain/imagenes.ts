// Regla 16: valores iniciales, ajustables.
export type TipoImagen = "perfil" | "logo" | "producto";

export const TAMANO_MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
// Excepción de la regla 16 (2026-10-09): las imágenes que la importación de Excel (regla 22) descarga de Drive son fotos que las
// propias emprendedoras subieron desde su teléfono. Lo que se guarda en R2 es el mismo WebP de siempre.
export const TAMANO_MAX_IMAGEN_DRIVE_BYTES = 20 * 1024 * 1024;
export const CALIDAD_WEBP = 80;
// Lado mayor máximo en píxeles; nunca se amplía.
export const LADO_MAX_PX: Record<TipoImagen, number> = { perfil: 800, logo: 512, producto: 1200 };

const CARPETA: Record<TipoImagen, string> = { perfil: "perfiles", logo: "logos", producto: "productos" };

// Regla 11: imágenes predeterminadas, siempre por separado (nunca una imagen combinada).
export const CLAVE_FOTO_PERFIL_PREDETERMINADA = "defaults/foto-perfil-anonima.webp";
export const CLAVE_LOGO_PREDETERMINADO = "defaults/logo-vacio.webp";

export const esImagenPredeterminada = (clave: string) => clave.startsWith("defaults/");

// Clave única por subida: como nunca se reescribe, la caché inmutable es segura (regla 16).
export const nuevaClaveImagen = (tipo: TipoImagen) => `${CARPETA[tipo]}/${crypto.randomUUID()}.webp`;

// Un WebP que ya pasó por el proceso de la regla 16 (lo hizo quien llama, por ejemplo la importación de Excel para saber, imagen por
// imagen, cuál sirve). Se guarda tal cual: procesarlo otra vez lo recomprimiría.
export interface ImagenYaProcesada {
  yaProcesada: Buffer;
}

// Lo que llega en un alta o cambio de imagen: un archivo, la excepción explícita (regla 11) o una imagen ya procesada.
export type ImagenEntrante = Buffer | "predeterminada" | ImagenYaProcesada;
