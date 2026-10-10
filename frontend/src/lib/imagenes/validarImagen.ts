// Revisión de una imagen en el navegador ANTES de subirla (regla 16): solo JPEG, PNG y WebP, de hasta 5 MB. Sin imports: lo prueba
// `validarImagen.test.ts` con el corredor de Node.
//
// No reemplaza la revisión del servidor (que decide por el contenido real y es quien manda): ahorra a la persona subir una foto de 8 MB
// o una foto HEIC de iPhone para enterarse, después de esperar, de que no servía. También evita que un archivo grande llegue a las
// Server Functions de Next, que lo rechazan por tamaño con un error que la pantalla no puede explicar.

export const TAMANO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024;
// Cuántos bytes del principio hacen falta para distinguir los tres formatos.
export const BYTES_DE_CABECERA = 12;

export interface DatosDeImagen {
  name: string;
  type: string;
  size: number;
}

export type ResultadoDeImagen = { ok: true } | { ok: false; mensaje: string };

const TIPOS_ACEPTADOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONES_ACEPTADAS = new Set(["jpg", "jpeg", "png", "webp"]);

const extensionDe = (nombre: string) => (nombre.includes(".") ? (nombre.split(".").pop() ?? "").toLowerCase() : "");
const megabytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");

// Los primeros bytes de cada formato: JPEG FF D8 FF; PNG 89 50 4E 47 0D 0A 1A 0A; WebP «RIFF», 4 bytes de tamaño y «WEBP».
export function formatoPorCabecera(cabecera: Uint8Array): "jpeg" | "png" | "webp" | null {
  const es = (inicio: number, bytes: number[]) => bytes.every((byte, i) => cabecera[inicio + i] === byte);
  if (es(0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (es(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (es(0, [0x52, 0x49, 0x46, 0x46]) && es(8, [0x57, 0x45, 0x42, 0x50])) return "webp";
  return null;
}

// `cabecera` es opcional: sin ella solo se revisan el tamaño y el tipo que declara el navegador.
export function validarImagen(datos: DatosDeImagen, cabecera?: Uint8Array): ResultadoDeImagen {
  if (datos.size === 0) return { ok: false, mensaje: "El archivo está vacío. Elige otra imagen." };
  if (datos.size > TAMANO_MAXIMO_IMAGEN_BYTES) {
    return { ok: false, mensaje: `La imagen pesa ${megabytes(datos.size)} MB y el máximo es 5 MB. Reduce su tamaño o elige otra.` };
  }

  const tipo = datos.type.toLowerCase();
  const extension = extensionDe(datos.name);
  if (tipo === "image/heic" || tipo === "image/heif" || extension === "heic" || extension === "heif") {
    return { ok: false, mensaje: "Las fotos en formato HEIC (el de los iPhone) no se admiten. Expórtala como JPG o PNG e inténtalo de nuevo." };
  }
  const tipoValido = TIPOS_ACEPTADOS.has(tipo);
  // Algunos sistemas no declaran el tipo: entonces vale la extensión.
  const extensionValida = EXTENSIONES_ACEPTADAS.has(extension);
  if (!tipoValido && !(tipo === "" && extensionValida)) {
    return { ok: false, mensaje: "Solo se admiten imágenes JPG, PNG o WebP." };
  }

  // El nombre y el tipo los pone quien eligió el archivo: si el contenido no es ninguno de los tres, no es una imagen aceptable.
  if (cabecera && cabecera.length >= BYTES_DE_CABECERA && formatoPorCabecera(cabecera) === null) {
    return { ok: false, mensaje: "Este archivo no parece una imagen JPG, PNG o WebP. Puede estar dañado o tener la extensión cambiada." };
  }
  return { ok: true };
}

// Para un `File` del navegador: lee solo el principio del archivo.
export async function validarArchivoDeImagen(archivo: File): Promise<ResultadoDeImagen> {
  let cabecera: Uint8Array | undefined;
  try {
    cabecera = new Uint8Array(await archivo.slice(0, BYTES_DE_CABECERA).arrayBuffer());
  } catch {
    // Un archivo que el navegador no deja leer (se borró, cambió de lugar): el servidor lo dirá si de verdad no sirve.
  }
  return validarImagen({ name: archivo.name, type: archivo.type, size: archivo.size }, cabecera);
}
