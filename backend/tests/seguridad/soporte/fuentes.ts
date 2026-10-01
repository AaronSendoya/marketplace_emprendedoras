import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

// Utilidades de las pruebas de caja blanca: leen el código fuente (no lo ejecutan) para comprobar
// propiedades que no se ven desde fuera, como "toda ruta exige autenticación".
export const RAIZ = process.cwd();

const normalizar = (ruta: string) => relative(RAIZ, ruta).replace(/\\/g, "/");

function recorrer(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    return entrada.isDirectory() ? recorrer(ruta) : [ruta];
  });
}

export interface Fuente {
  ruta: string;
  texto: string;
}

const esPrueba = (ruta: string) => /\.test\.ts$/.test(ruta) || /(^|\/)testing\//.test(ruta);

// Código que se despliega: src/ sin pruebas ni dobles de prueba.
export const fuentesDeProduccion = (): Fuente[] =>
  recorrer(join(RAIZ, "src"))
    .map(normalizar)
    .filter((ruta) => ruta.endsWith(".ts") && !esPrueba(ruta))
    .map((ruta) => ({ ruta, texto: leer(ruta) }));

export const leer = (rutaRelativa: string) => readFileSync(join(RAIZ, rutaRelativa), "utf8");

export interface RutaApi {
  archivo: string;
  // Ruta como la documenta OpenAPI: /perfiles/{id}
  ruta: string;
  texto: string;
  // Método HTTP -> texto del manejador exportado.
  manejadores: Record<string, string>;
}

const METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

// Route Handlers de la API (src/app/api/v1/**/route.ts).
export function rutasApi(): RutaApi[] {
  return fuentesDeProduccion()
    .filter((f) => /^src\/app\/api\/v1\/.+\/route\.ts$/.test(f.ruta))
    .map((f) => {
      const ruta = "/" + f.ruta.replace(/^src\/app\/api\/v1\//, "").replace(/\/route\.ts$/, "").replace(/\[(\w+)\]/g, "{$1}");
      const marcas = [...f.texto.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\b/g)];
      const manejadores: Record<string, string> = {};
      marcas.forEach((marca, i) => {
        manejadores[marca[1]] = f.texto.slice(marca.index, marcas[i + 1]?.index ?? f.texto.length);
      });
      return { archivo: f.ruta, ruta, texto: f.texto, manejadores };
    });
}

export const METODOS_HTTP = METODOS;

export function analizar(texto: string, nombre = "fuente.ts"): ts.SourceFile {
  return ts.createSourceFile(nombre, texto, ts.ScriptTarget.Latest, true);
}

export function recorrerNodos(nodo: ts.Node, visitar: (n: ts.Node) => void): void {
  visitar(nodo);
  ts.forEachChild(nodo, (hijo) => recorrerNodos(hijo, visitar));
}
