// Descarga un contenido generado en el navegador (los CSV de resultado y la plantilla de ejemplo). Solo Client Components.
export function descargarArchivo(nombre: string, contenido: BlobPart, tipo: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Margen para que el navegador empiece la descarga antes de soltar el objeto.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function bytesDeBase64(base64: string): Uint8Array<ArrayBuffer> {
  const texto = atob(base64);
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

// Fecha corta para el nombre de un archivo descargado (2026-10-06), en hora local.
export function fechaParaNombreDeArchivo(ahora = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

// 41 KB, 1,3 MB: el tamaño de un archivo para mostrárselo a quien lo eligió.
export function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
