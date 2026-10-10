import { TAMANO_MAX_IMAGEN_DRIVE_BYTES } from "@/shared/domain/imagenes";
import type { ArchivoDeDrive } from "./IArchivosDrive";

// Regla 22 (2026-10-09): ¿sirve este archivo de Drive como foto o logo? Solo mira los metadatos: el tipo real lo vuelve a decidir el
// proceso de imágenes (regla 16) al descargarlo, porque el tipo que declara Drive no es de fiar.
export const TIPOS_DE_IMAGEN_ACEPTADOS: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);

const UN_MEGABYTE = 1024 * 1024;

export const aMegabytes = (bytes: number) => Math.max(1, Math.ceil(bytes / UN_MEGABYTE));

export type VeredictoDeArchivo =
  | { estado: "ok" }
  | { estado: "sin_acceso" }
  | { estado: "no_es_imagen"; tipo: string }
  | { estado: "muy_grande"; megabytes: number };

// Cómo se nombra un tipo de archivo ante el Admin («es una carpeta», «es un PDF»).
export function describirTipoDeArchivo(tipoMime: string): string {
  const tipo = tipoMime.toLowerCase();
  if (tipo === "application/vnd.google-apps.folder") return "una carpeta";
  if (tipo === "application/pdf") return "un PDF";
  if (tipo === "image/heic" || tipo === "image/heif") return "una foto HEIC (el formato de los iPhone)";
  if (tipo === "image/gif") return "un GIF";
  if (tipo === "image/svg+xml") return "un SVG";
  if (tipo.startsWith("image/")) return `una imagen ${tipo.slice("image/".length).toUpperCase()}`;
  if (tipo.startsWith("video/")) return "un video";
  if (tipo.startsWith("audio/")) return "un audio";
  if (tipo.startsWith("application/vnd.google-apps.")) return "un documento de Google";
  return "otro tipo de archivo";
}

export function evaluarArchivoDeDrive(archivo: ArchivoDeDrive): VeredictoDeArchivo {
  // Quien lo comparte puede impedir que lectores y comentaristas lo descarguen: la cuenta lo ve pero no puede bajarlo.
  if (!archivo.puedeDescargar) return { estado: "sin_acceso" };
  if (!TIPOS_DE_IMAGEN_ACEPTADOS.has(archivo.tipoMime.toLowerCase())) return { estado: "no_es_imagen", tipo: describirTipoDeArchivo(archivo.tipoMime) };
  if (archivo.bytes !== null && archivo.bytes > TAMANO_MAX_IMAGEN_DRIVE_BYTES) return { estado: "muy_grande", megabytes: aMegabytes(archivo.bytes) };
  return { estado: "ok" };
}
