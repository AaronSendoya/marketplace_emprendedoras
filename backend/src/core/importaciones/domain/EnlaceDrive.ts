// Regla 22 (2026-10-09): lo que trae la columna de la foto o del logo es un enlace de Drive. Solo se toma de él el id del archivo; nunca
// se pide una dirección que venga del Excel (regla 17), así que el id se valida con una lista blanca de caracteres.

export type EnlaceDeDrive =
  | { tipo: "vacio" }
  | { tipo: "archivo"; id: string }
  | { tipo: "carpeta" }
  | { tipo: "invalido"; texto: string };

// Letras, números, guion y guion bajo: lo único que usa Drive en un id. Los largos reales rondan los 33 caracteres.
export const ID_DE_DRIVE = /^[A-Za-z0-9_-]{10,128}$/;

const HOSTS_DE_DRIVE = new Set(["drive.google.com", "docs.google.com", "drive.usercontent.google.com"]);

// Los enlaces que genera Google Forms (`/open?id=`) y los que se copian a mano desde Drive (`/file/d/ID/view`, `/uc?id=`).
export function interpretarEnlaceDeDrive(texto: string): EnlaceDeDrive {
  const original = texto.trim();
  if (!original) return { tipo: "vacio" };

  let url: URL;
  try {
    // Sin esquema («drive.google.com/open?id=…») también se entiende.
    url = new URL(/^https?:\/\//i.test(original) ? original : `https://${original}`);
  } catch {
    return { tipo: "invalido", texto: original };
  }
  if (!["https:", "http:"].includes(url.protocol) || !HOSTS_DE_DRIVE.has(url.hostname.toLowerCase())) return { tipo: "invalido", texto: original };

  const segmentos = url.pathname.split("/").filter(Boolean);
  // Una carpeta (`/drive/folders/ID`, `/drive/u/0/folders/ID`) no es una imagen.
  if (segmentos.includes("folders")) return { tipo: "carpeta" };

  const delCamino = segmentos[0] === "file" && segmentos[1] === "d" ? segmentos[2] : undefined;
  const id = delCamino ?? url.searchParams.get("id") ?? undefined;
  return id && ID_DE_DRIVE.test(id) ? { tipo: "archivo", id } : { tipo: "invalido", texto: original };
}
