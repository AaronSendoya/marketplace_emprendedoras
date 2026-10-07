import { terminosDeBusqueda } from "./BusquedaTexto";

// Reglas 20 y 21, resultados similares: cuando una búsqueda de texto no tiene ninguna coincidencia exacta se buscan
// resultados parecidos, que toleran errores de tipeo. Este archivo es el motor, lógica pura y sin saber de perfiles
// ni de productos: cada módulo le entrega sus textos como `DocumentoBuscable` y la base solo aporta esos textos. Aquí
// se decide qué se parece a qué y en qué orden.

// De cada descripción se compara solo el comienzo: una descripción de 2000 caracteres no se parece más por ser larga.
export const MAXIMO_DE_CARACTERES_DE_DESCRIPCION = 300;

// Dónde se encontró la coincidencia, de lo que más dice de una búsqueda a lo que menos: el nombre de lo que se busca
// (de la persona o del negocio en perfiles, del producto en productos), otro texto corto asociado y una descripción.
// Solo desempata entre dos resultados igual de parecidos.
export type Relevancia = "principal" | "secundario" | "descripcion";

export interface CampoBuscable {
  texto: string | null;
  relevancia: Relevancia;
}

export interface DocumentoBuscable {
  id: string;
  // Con él se ordenan los que empatan en todo lo demás.
  nombre: string;
  campos: CampoBuscable[];
}

// Minúsculas y sin acentos, como los compara la colación `utf8mb4_unicode_ci` de la búsqueda exacta (`ñ` cuenta como
// `n`). Así lo aproximado y lo exacto coinciden en lo que es "la misma letra".
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// Las palabras de un texto ya normalizado: cualquier cosa que no sea letra o número las separa.
function palabrasDe(textoNormalizado: string): string[] {
  return textoNormalizado.split(/[^\p{L}\p{N}]+/u).filter((palabra) => palabra.length > 0);
}

// La palabra reducida a cómo suena en español, para que `dulses` y `dulces`, `vaca` y `baca` o `hoja` y `oja` se
// reconozcan como iguales. Recibe texto ya normalizado. No es una transcripción fonética completa: junta las
// confusiones de escritura más comunes y deja el resto a la distancia de edición.
export function claveFonetica(palabra: string): string {
  return palabra
    .replace(/ch/g, "ʧ")
    .replace(/ll/g, "y")
    .replace(/qu/g, "k")
    .replace(/g(?=[ei])/g, "j")
    .replace(/gu(?=[ei])/g, "g")
    .replace(/c(?=[ei])/g, "s")
    .replace(/z/g, "s")
    .replace(/[cq]/g, "k")
    .replace(/v/g, "b")
    .replace(/h/g, "");
}

// Lo que cuesta cada diferencia en el orden de los resultados y en lo que se tolera: una letra de más, de menos,
// cambiada o dos seguidas intercambiadas cuesta 10. Un error probable de quien escribe cuesta menos: una vocal por
// otra (`aarun`, `Aaron`) o una tecla por su vecina en el teclado (`dulxes`, `dulces`) cuestan 6. No cuestan la mitad
// porque entonces varios juntos dejarían pasar palabras que no tienen nada que ver (`dluces` y `Flores`): con 6, una
// palabra de 3 a 5 letras admite uno y una de 6 o más admite hasta dos y media diferencias. Una palabra que solo suena
// igual (`dulses`, `dulces`) cuesta 5, y una pegada a la siguiente (`granotostado`), también. Siempre pesa más que el
// campo donde se encontró.
const COSTE_DE_UNA_DIFERENCIA = 10;
const COSTE_DE_UN_ERROR_PROBABLE = 6;
const COSTE_DE_SONAR_IGUAL = 5;
const COSTE_DE_IR_PEGADA = 5;
// Cuánto peor que el mejor resultado puede ser uno para seguir apareciendo: una diferencia entera. Sin este corte,
// con la tolerancia de 6 letras en adelante, detrás del acierto aparecerían resultados cuya única relación es que una
// palabra suya se parece vagamente a lo escrito.
const MARGEN_SOBRE_EL_MEJOR = COSTE_DE_UNA_DIFERENCIA;

// Cuántas diferencias completas se toleran según la palabra buscada (ya normalizada), como los buscadores profesionales
// (Elasticsearch, Algolia): hasta 2 letras, ninguna; de 3 a 5, una; de 6 en adelante, dos. Los números no se
// aproximan: `101` no es una errata de `100`.
export function diferenciasPermitidas(termino: string): number {
  if (/\d/.test(termino) || termino.length < 3) return 0;
  return termino.length <= 5 ? 1 : 2;
}

const VOCALES = new Set(["a", "e", "i", "o", "u"]);

// Teclas vecinas en un teclado QWERTY (las letras son las mismas en el español; la `ñ` ya llega como `n`). Las filas
// van desplazadas entre sí, así que cada tecla toca a las de su fila y a las dos de arriba y de abajo.
const TECLAS_VECINAS = (() => {
  const filas: [string, number][] = [
    ["qwertyuiop", 0],
    ["asdfghjkl", 0.25],
    ["zxcvbnm", 0.75],
  ];
  const posiciones = filas.flatMap(([letras, desplazamiento], fila) => [...letras].map((letra, i) => ({ letra, x: i + desplazamiento, y: fila })));
  const vecinas = new Set<string>();
  for (const a of posiciones) {
    for (const b of posiciones) {
      if (a.letra !== b.letra && Math.hypot(a.x - b.x, a.y - b.y) < 1.3) vecinas.add(a.letra + b.letra);
    }
  }
  return vecinas;
})();

function costeDeCambiar(a: string, b: string): number {
  if (a === b) return 0;
  if ((VOCALES.has(a) && VOCALES.has(b)) || TECLAS_VECINAS.has(a + b)) return COSTE_DE_UN_ERROR_PROBABLE;
  return COSTE_DE_UNA_DIFERENCIA;
}

// Coste de pasar de una palabra a otra (Damerau-Levenshtein restringida con los costes de arriba). Para en cuanto el
// coste no puede quedar en `presupuesto` o menos y devuelve `presupuesto + 1`.
export function costeDeEdicion(a: string, b: string, presupuesto: number): number {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) * COSTE_DE_UNA_DIFERENCIA > presupuesto) return presupuesto + 1;

  let antepenultima: number[] = [];
  let anterior = Array.from({ length: m + 1 }, (_, j) => j * COSTE_DE_UNA_DIFERENCIA);
  for (let i = 1; i <= n; i++) {
    const actual = [i * COSTE_DE_UNA_DIFERENCIA];
    let minimoDeLaFila = actual[0];
    for (let j = 1; j <= m; j++) {
      let valor = Math.min(
        anterior[j] + COSTE_DE_UNA_DIFERENCIA,
        actual[j - 1] + COSTE_DE_UNA_DIFERENCIA,
        anterior[j - 1] + costeDeCambiar(a[i - 1], b[j - 1]),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) valor = Math.min(valor, antepenultima[j - 2] + COSTE_DE_UNA_DIFERENCIA);
      actual[j] = valor;
      if (valor < minimoDeLaFila) minimoDeLaFila = valor;
    }
    if (minimoDeLaFila > presupuesto) return presupuesto + 1;
    antepenultima = anterior;
    anterior = actual;
  }
  return Math.min(anterior[m], presupuesto + 1);
}

// Qué tan parecida es la palabra buscada a una palabra del catálogo. Una palabra buscada de 6 letras o más también se
// compara con el comienzo de las más largas (la persona puede seguir escribiendo: `dulsess` se parece a `dulces`);
// una de menos, solo con palabras completas, porque con tan pocas letras casi cualquier comienzo se parece a algo
// (`torta` y `tostado`). Devuelve `presupuesto + 1` si no alcanza.
function costeConComienzo(buscada: string, palabra: string, presupuesto: number): number {
  const largos = new Set<number>();
  if (buscada.length >= 6) for (const largo of [buscada.length - 1, buscada.length, buscada.length + 1]) largos.add(largo);
  if (Math.abs(palabra.length - buscada.length) * COSTE_DE_UNA_DIFERENCIA <= presupuesto) largos.add(palabra.length);

  let mejor = presupuesto + 1;
  for (const largo of largos) {
    if (largo < 1 || largo > palabra.length) continue;
    mejor = Math.min(mejor, costeDeEdicion(buscada, palabra.slice(0, largo), presupuesto));
    if (mejor === 0) break;
  }
  return mejor;
}

// Lo que menos pesa en el orden entre dos resultados igual de parecidos: dónde se encontró la coincidencia.
const PENALIZACION: Record<Relevancia, number> = { principal: 0, secundario: 1, descripcion: 2 };

interface Entrada {
  texto: string;
  // El mismo texto sin espacios ni signos, para reconocer una palabra que quien busca escribió pegada a la siguiente.
  compacto: string;
  palabras: string[];
  penalizacion: number;
}

function entradasDe(documento: DocumentoBuscable): Entrada[] {
  const entradas: Entrada[] = [];
  for (const { texto, relevancia } of documento.campos) {
    if (!texto) continue;
    const normalizado = normalizarTexto(relevancia === "descripcion" ? texto.slice(0, MAXIMO_DE_CARACTERES_DE_DESCRIPCION) : texto);
    entradas.push({
      texto: normalizado,
      compacto: normalizado.replace(/[^\p{L}\p{N}]+/gu, ""),
      palabras: palabrasDe(normalizado),
      penalizacion: PENALIZACION[relevancia],
    });
  }
  return entradas;
}

// Para cada palabra distinta del catálogo (con su clave fonética) que se parece a la buscada, lo que cuesta
// parecerse. Se hace una vez por palabra distinta y no una por aparición: el mismo vocabulario se repite en cientos de
// productos.
function palabrasParecidas(buscada: string, vocabulario: Map<string, string>): Map<string, number> {
  const parecidas = new Map<string, number>();
  const presupuesto = diferenciasPermitidas(buscada) * COSTE_DE_UNA_DIFERENCIA;
  if (presupuesto === 0) return parecidas;

  const claveBuscada = claveFonetica(buscada);
  // En una palabra corta, una letra distinta al principio casi siempre es otra palabra (`casa`, `masa`); con
  // sonido parecido (`vaca`, `baca`) sí se acepta.
  const exigeMismaInicial = buscada.length <= 5;

  for (const [palabra, clave] of vocabulario) {
    if (exigeMismaInicial && clave[0] !== claveBuscada[0]) continue;
    const porLetras = costeConComienzo(buscada, palabra, presupuesto);
    const porSonido = costeConComienzo(claveBuscada, clave, presupuesto);
    const coste = Math.min(
      porLetras <= presupuesto ? porLetras : Number.POSITIVE_INFINITY,
      porSonido <= presupuesto ? porSonido + COSTE_DE_SONAR_IGUAL : Number.POSITIVE_INFINITY,
    );
    if (coste !== Number.POSITIVE_INFINITY) parecidas.set(palabra, coste);
  }
  return parecidas;
}

// Palabras de enlace que quien busca escribe como en una frase (`dulces de ana`) y que casi nunca están en el nombre
// de un negocio o de un producto: no deben impedir una coincidencia.
const PALABRAS_VACIAS = new Set(["a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "lo", "los", "o", "para", "por", "u", "un", "una", "unas", "unos", "y"]);

// Las listas de palabras a buscar: la escrita (sin las palabras vacías, salvo que no quede otra) y, por cada par de
// palabras seguidas, otra con el par pegado, porque quien escribe a veces separa una palabra que va junta (`tos tdo`
// para `tostado`). Las pegadas solo se prueban si la escrita no encuentra nada.
function listasDePalabras(buscadas: string[]): { escrita: string[]; pegadas: string[][] } {
  const significativas = buscadas.filter((buscada) => !PALABRAS_VACIAS.has(buscada));
  const escrita = significativas.length > 0 ? significativas : buscadas;
  const pegadas = escrita.slice(0, -1).map((palabra, i) => [...escrita.slice(0, i), palabra + escrita[i + 1], ...escrita.slice(i + 2)]);
  return { escrita, pegadas };
}

type Candidato = { documento: DocumentoBuscable; entradas: Entrada[] };

// Una palabra buscada se busca también pegada a las vecinas del texto (`granotostado`, `16gb` para `16 GB`) si tiene 5
// letras o más, o si lleva un número y 3 o más caracteres: más corta, casi cualquier par de palabras la contiene.
const puedeIrPegada = (buscada: string) => buscada.length >= 5 || (buscada.length >= 3 && /\d/.test(buscada));

// El puntaje de cada documento que tiene algo parecido a todas las palabras de la lista (igual que en la búsqueda
// exacta: todas, en cualquier campo y orden). Lo que cuesta cada palabra es lo mínimo que se encuentre en cualquiera de
// sus campos: exacta (0), dentro del texto sin espacios (`granotostado` para `Grano tostado`) o parecida a una palabra.
function puntuar(candidatos: Candidato[], palabras: string[], parecidasDe: (palabra: string) => Map<string, number>): Map<string, number> {
  const puntajes = new Map<string, number>();
  const listas = palabras.map((buscada) => ({ buscada, parecidas: parecidasDe(buscada) }));

  for (const { documento, entradas } of candidatos) {
    let puntaje = 0;
    for (const { buscada, parecidas } of listas) {
      let mejor = Number.POSITIVE_INFINITY;
      for (const entrada of entradas) {
        let coste = entrada.texto.includes(buscada) ? 0 : Number.POSITIVE_INFINITY;
        if (coste !== 0 && puedeIrPegada(buscada) && entrada.compacto.includes(buscada)) coste = COSTE_DE_IR_PEGADA;
        for (const palabra of entrada.palabras) {
          const costeDeLaPalabra = parecidas.get(palabra);
          if (costeDeLaPalabra !== undefined && costeDeLaPalabra < coste) coste = costeDeLaPalabra;
        }
        // El parecido pesa más que el campo: una coincidencia exacta en una descripción gana a una aproximada en un nombre.
        mejor = Math.min(mejor, coste + entrada.penalizacion);
      }
      puntaje += mejor;
      if (puntaje === Number.POSITIVE_INFINITY) break;
    }
    if (puntaje !== Number.POSITIVE_INFINITY) puntajes.set(documento.id, puntaje);
  }
  return puntajes;
}

// Los ids de los documentos que se parecen al texto buscado, del que más al que menos, sin los que se parecen mucho
// menos que el mejor (`MARGEN_SOBRE_EL_MEJOR`). Lo escrito sin letras ni números (`!!!`) no es una palabra y se
// ignora; con nada más que eso no hay resultados. Un guion o un punto separan palabras (`ana-maria` busca `ana` y
// `maria`).
export function ordenarPorSimilitud(texto: string, documentos: DocumentoBuscable[]): string[] {
  const buscadas = terminosDeBusqueda(texto).flatMap((termino) => palabrasDe(normalizarTexto(termino)));
  if (buscadas.length === 0) return [];

  const candidatos: Candidato[] = documentos.map((documento) => ({ documento, entradas: entradasDe(documento) }));

  const vocabulario = new Map<string, string>();
  for (const { entradas } of candidatos) {
    for (const entrada of entradas) {
      for (const palabra of entrada.palabras) if (!vocabulario.has(palabra)) vocabulario.set(palabra, claveFonetica(palabra));
    }
  }

  // Se calcula una vez por palabra buscada, aunque aparezca en varias listas.
  const memoria = new Map<string, Map<string, number>>();
  const parecidasDe = (palabra: string) => {
    let parecidas = memoria.get(palabra);
    if (!parecidas) {
      parecidas = palabrasParecidas(palabra, vocabulario);
      memoria.set(palabra, parecidas);
    }
    return parecidas;
  };

  const { escrita, pegadas } = listasDePalabras(buscadas);
  const puntajes = puntuar(candidatos, escrita, parecidasDe);
  if (puntajes.size === 0) {
    for (const lista of pegadas) {
      for (const [id, puntaje] of puntuar(candidatos, lista, parecidasDe)) {
        puntajes.set(id, Math.min(puntaje, puntajes.get(id) ?? Number.POSITIVE_INFINITY));
      }
    }
  }
  if (puntajes.size === 0) return [];

  const nombres = new Map(documentos.map((documento) => [documento.id, normalizarTexto(documento.nombre)]));
  const mejor = Math.min(...puntajes.values());
  return [...puntajes]
    .filter(([, puntaje]) => puntaje <= mejor + MARGEN_SOBRE_EL_MEJOR)
    .sort(([idA, a], [idB, b]) => a - b || (nombres.get(idA) ?? "").localeCompare(nombres.get(idB) ?? "") || idA.localeCompare(idB))
    .map(([id]) => id);
}
