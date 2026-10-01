import { ErrorValidacion } from "@/shared/domain/errors";
import { TAMANO_MAX_IMAGEN_BYTES } from "@/shared/domain/imagenes";
import { leerConLimite } from "./cuerpo";

// Tope de todo el cuerpo (archivos y campos de texto). Debe ser menor que proxyClientMaxBodySize
// (next.config.ts): Next recorta en silencio lo que pase de ese valor.
const MARGEN_CAMPOS_BYTES = 1024 * 1024;
export const LIMITE_CUERPO_UNA_IMAGEN = TAMANO_MAX_IMAGEN_BYTES + MARGEN_CAMPOS_BYTES;
export const LIMITE_CUERPO_DOS_IMAGENES = 2 * TAMANO_MAX_IMAGEN_BYTES + MARGEN_CAMPOS_BYTES;

export async function leerFormulario(request: Request, limiteBytes: number): Promise<FormData> {
  if (!/^multipart\/form-data\b/i.test(request.headers.get("content-type") ?? "")) {
    throw new ErrorValidacion("El cuerpo debe ser multipart/form-data.");
  }
  const cuerpo = await leerConLimite(request, limiteBytes);
  try {
    // Solo Content-Type (lleva el boundary): el resto de cabeceras, como Content-Length, no aplican al cuerpo ya leído.
    const headers = { "content-type": request.headers.get("content-type") ?? "" };
    return await new Request(request.url, { method: "POST", headers, body: cuerpo }).formData();
  } catch {
    throw new ErrorValidacion("El cuerpo multipart no es válido.");
  }
}

export interface FormularioSeparado {
  texto: Record<string, string>;
  archivos: Record<string, Buffer>;
}

// Separa los campos de texto de los archivos. Un campo repetido, un archivo no esperado o un
// archivo vacío se rechazan (un archivo vacío suele ser un input de archivo sin elegir).
export async function separarFormulario(form: FormData, camposArchivo: readonly string[]): Promise<FormularioSeparado> {
  const texto: Record<string, string> = {};
  const archivos: Record<string, Buffer> = {};
  const vistos = new Set<string>();

  for (const [campo, valor] of form.entries()) {
    if (vistos.has(campo)) throw new ErrorValidacion("Hay un campo repetido.", [{ campo, mensaje: "Campo repetido." }]);
    vistos.add(campo);

    if (typeof valor === "string") {
      texto[campo] = valor;
      continue;
    }
    if (!camposArchivo.includes(campo)) {
      throw new ErrorValidacion("Hay un archivo no permitido.", [{ campo, mensaje: "Campo no permitido." }]);
    }
    if (valor.size === 0) continue;
    archivos[campo] = Buffer.from(await valor.arrayBuffer());
  }
  return { texto, archivos };
}
