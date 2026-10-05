// Un parámetro de búsqueda (`?nuevo=1`) puede llegar repetido como arreglo; aquí solo interesa el
// primero. "1" es el único valor que cuenta como "sí": el resto (ausente, vacío, otro) es "no".
export function parametroActivo(valor: string | string[] | undefined): boolean {
  return (Array.isArray(valor) ? valor[0] : valor) === "1";
}
