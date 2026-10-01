import { ErrorArchivoMuyGrande, ErrorValidacion } from "@/shared/domain/errors";

// Regla 17: un cuerpo JSON admite hasta 100 KB (los datos son texto corto; las imágenes van por multipart).
export const LIMITE_CUERPO_JSON = 100 * 1024;

// Lee el cuerpo por partes y corta al pasar el límite, sin cargar en memoria más de lo permitido
// (con o sin cabecera Content-Length).
export async function leerConLimite(request: Request, limiteBytes: number, mensajeExceso?: string): Promise<Blob> {
  const excedido = () => new ErrorArchivoMuyGrande(mensajeExceso);
  const declarado = Number(request.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > limiteBytes) throw excedido();
  if (!request.body) throw new ErrorValidacion("El cuerpo está vacío.");

  const partes: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;
  const lector = request.body.getReader();
  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.byteLength;
      if (total > limiteBytes) throw excedido();
      partes.push(value);
    }
  } finally {
    lector.releaseLock();
  }
  return new Blob(partes);
}
