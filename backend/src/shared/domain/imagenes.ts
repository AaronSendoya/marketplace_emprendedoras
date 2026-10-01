// Regla 16: valores iniciales, ajustables.
export type TipoImagen = "perfil" | "logo" | "producto";

export const TAMANO_MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
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

// Lo que llega en un alta o cambio de imagen: un archivo, o la excepción explícita (regla 11).
export type ImagenEntrante = Buffer | "predeterminada";
