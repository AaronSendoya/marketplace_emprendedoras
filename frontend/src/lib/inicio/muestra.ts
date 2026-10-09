// Inicio (CLAUDE.md sección 6, regla 14, punto k): el orden de las tarjetas de los carruseles es al azar en cada visita, para no
// favorecer a las más nuevas ni a las primeras del alfabeto. Lo decide el servidor al armar la página (no el navegador), así
// que no hay parpadeo ni diferencia entre lo que pinta el servidor y lo que hidrata el cliente.

// Fisher-Yates: todas las ordenaciones tienen la misma probabilidad (`sort(() => Math.random() - 0.5)` no la tiene). Devuelve una
// copia; no toca la lista de entrada. `aleatorio` se puede inyectar para probarlo.
export function mezclar<T>(lista: readonly T[], aleatorio: () => number = Math.random): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Hasta `maximo` elementos al azar; si hay `maximo` o menos, se devuelven todos (también mezclados).
export const muestraAleatoria = <T>(lista: readonly T[], maximo: number, aleatorio: () => number = Math.random): T[] =>
  mezclar(lista, aleatorio).slice(0, maximo);

// Cuántos elementos hay de cada grupo (por el `id` que devuelve `clave`).
export function contarPor<T>(lista: readonly T[], clave: (elemento: T) => { id: string }): Map<string, number> {
  const conteo = new Map<string, number>();
  for (const elemento of lista) {
    const { id } = clave(elemento);
    conteo.set(id, (conteo.get(id) ?? 0) + 1);
  }
  return conteo;
}
