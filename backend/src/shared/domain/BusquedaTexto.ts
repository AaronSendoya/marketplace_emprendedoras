// Reglas 20 y 21: el texto de `GET /perfiles?q=` y de `GET /marketplace/productos?q=` se separa en palabras y cada una
// debe aparecer en alguno de los campos buscados. Con más de este número de palabras, las demás se ignoran: cada
// palabra suma una condición a la consulta de cada fila (y las de perfiles, una subconsulta), y una frase de más de
// seis palabras no refina nada que no refinen ya las seis primeras.
export const MAXIMO_DE_TERMINOS_DE_BUSQUEDA = 6;

// Las palabras de un texto de búsqueda, sin espacios de más (cualquier espacio en blanco las separa, también el
// no separable que pega un teclado móvil) y sin repetir el trabajo con las vacías. El texto ya llega recortado
// y de 1 a 100 caracteres (los esquemas de la consulta); escapar los comodines de LIKE no es tarea de esta
// función sino del repositorio, que es quien arma la consulta.
export function terminosDeBusqueda(texto: string): string[] {
  return texto
    .split(/\s+/)
    .filter((termino) => termino.length > 0)
    .slice(0, MAXIMO_DE_TERMINOS_DE_BUSQUEDA);
}
