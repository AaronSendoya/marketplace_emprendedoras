// Sin imports: lo prueba `resumen.test.ts` con el corredor de Node.

// Texto corto para la descripción de una página (la etiqueta `description`): espacios y saltos de línea colapsados, y cortado en una
// palabra completa con «...» si pasa del máximo. Sin texto devuelve una cadena vacía.
export function resumirTexto(texto: string | null | undefined, maximo = 160): string {
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
  if (limpio.length <= maximo) return limpio;
  const corte = limpio.slice(0, maximo - 3);
  const ultimoEspacio = corte.lastIndexOf(" ");
  // Si hay un espacio razonablemente cerca del final se corta ahí para no partir una palabra; si no (una sola palabra larguísima), se corta seco.
  const base = ultimoEspacio > maximo * 0.6 ? corte.slice(0, ultimoEspacio) : corte;
  return `${base.trimEnd()}...`;
}
