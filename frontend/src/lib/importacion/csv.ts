// Regla 22: los CSV que se descargan al terminar (credenciales y "por revisar"). Se generan en el navegador y no pasan por el
// servidor. Van con coma, comillas dobles y saltos de línea CRLF, y con la marca de orden de bytes (BOM) para que Excel abra
// bien las tildes y las eñes.

// Una celda que empieza con `=`, `+`, `-` o `@` (o con tabulación o retorno) se interpreta como fórmula al abrir el CSV en Excel
// ("inyección de fórmulas"): el texto viene de un Excel ajeno, así que se le antepone una comilla simple, que Excel no muestra.
const COMIENZA_FORMULA = /^[=+\-@\t\r]/;

export const neutralizarFormula = (texto: string): string => (COMIENZA_FORMULA.test(texto) ? `'${texto}` : texto);

function celda(valor: string): string {
  return /[",\r\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

// `filas[0]` es el encabezado. Las celdas que vienen de un archivo ajeno deben pasar antes por `neutralizarFormula`; la
// contraseña temporal no, porque la genera el sistema y no debe cambiar ni un carácter.
export function aCsv(filas: readonly (readonly string[])[]): string {
  return `﻿${filas.map((fila) => fila.map(celda).join(",")).join("\r\n")}\r\n`;
}
