import { describe, expect, it } from "vitest";
import { TAMANO_MAX_IMAGEN_DRIVE_BYTES } from "@/shared/domain/imagenes";
import { aMegabytes, describirTipoDeArchivo, evaluarArchivoDeDrive } from "./EvaluarArchivoDrive";
import type { ArchivoDeDrive } from "./IArchivosDrive";

const archivo = (parches: Partial<ArchivoDeDrive> = {}): ArchivoDeDrive => ({ nombre: "foto.jpg", tipoMime: "image/jpeg", bytes: 2_000_000, puedeDescargar: true, ...parches });

describe("evaluarArchivoDeDrive (regla 22)", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "IMAGE/JPEG"])("acepta %s", (tipoMime) => {
    expect(evaluarArchivoDeDrive(archivo({ tipoMime }))).toEqual({ estado: "ok" });
  });

  it("acepta un archivo cuyo peso Drive no informa: el límite se vuelve a aplicar al descargarlo", () => {
    expect(evaluarArchivoDeDrive(archivo({ bytes: null }))).toEqual({ estado: "ok" });
  });

  it("el tope es de 20 MB: justo en el tope pasa y un byte más no", () => {
    expect(evaluarArchivoDeDrive(archivo({ bytes: TAMANO_MAX_IMAGEN_DRIVE_BYTES }))).toEqual({ estado: "ok" });
    expect(evaluarArchivoDeDrive(archivo({ bytes: TAMANO_MAX_IMAGEN_DRIVE_BYTES + 1 }))).toEqual({ estado: "muy_grande", megabytes: 21 });
  });

  it("dice cuántos megas pesa, redondeando hacia arriba", () => {
    expect(aMegabytes(23.2 * 1024 * 1024)).toBe(24);
    expect(aMegabytes(1)).toBe(1);
  });

  it.each([
    ["image/heic", "una foto HEIC (el formato de los iPhone)"],
    ["image/gif", "un GIF"],
    ["application/pdf", "un PDF"],
    ["application/vnd.google-apps.folder", "una carpeta"],
    ["application/vnd.google-apps.document", "un documento de Google"],
    ["video/mp4", "un video"],
  ])("rechaza %s diciendo qué es", (tipoMime, tipo) => {
    expect(evaluarArchivoDeDrive(archivo({ tipoMime }))).toEqual({ estado: "no_es_imagen", tipo });
  });

  it("un archivo que la cuenta ve pero no puede descargar cuenta como sin acceso", () => {
    expect(evaluarArchivoDeDrive(archivo({ puedeDescargar: false }))).toEqual({ estado: "sin_acceso" });
  });

  it("nombra un tipo desconocido sin inventar nada", () => {
    expect(describirTipoDeArchivo("application/x-algo")).toBe("otro tipo de archivo");
    expect(describirTipoDeArchivo("image/tiff")).toBe("una imagen TIFF");
  });
});
