import ts from "typescript";
import { describe, expect, it } from "vitest";
import { analizar, fuentesDeProduccion, recorrerNodos } from "./soporte/fuentes";

// Regla 17: ninguna consulta arma texto SQL con datos de la petición; los valores siempre van como
// parámetros (`?`). Se analiza el árbol del código (AST), no el texto, para no depender del formato.
const LLAMADAS_SQL = new Set(["consultar", "ejecutar", "query", "execute"]);
// Receptores que son la base de datos (los casos de uso también tienen un método ejecutar).
const RECEPTORES_SQL = /(^|\.)(db|destino|conexion|tx)$/;

// Interpolaciones permitidas dentro de una consulta. Cada una está revisada a mano:
//  - constantes en MAYÚSCULAS: fragmentos SQL fijos definidos en el mismo archivo.
//  - donde / condiciones.join: cláusulas armadas solo con literales (se comprueba abajo).
//  - COLUMNAS_EDITABLES[clave]: nombres de columna de una lista blanca fija.
const INTERPOLACIONES_PERMITIDAS: RegExp[] = [
  /^[A-Z][A-Z0-9_]*$/,
  /^donde$/,
  /^condiciones\.join\(" AND "\)$/,
  /^COLUMNAS_EDITABLES\[clave\]$/,
  /^columnas\.map\(\(clave\) => `\$\{COLUMNAS_EDITABLES\[clave\]\} = \?`\)\.join\(", "\)$/,
];

const conSql = fuentesDeProduccion().filter((f) => /\.(consultar|ejecutar|query|execute)\b|\bconsultar</.test(f.texto));

function llamadasSql(fuente: { ruta: string; texto: string }) {
  const encontradas: ts.CallExpression[] = [];
  recorrerNodos(analizar(fuente.texto, fuente.ruta), (nodo) => {
    if (!ts.isCallExpression(nodo) || !ts.isPropertyAccessExpression(nodo.expression)) return;
    if (LLAMADAS_SQL.has(nodo.expression.name.text) && RECEPTORES_SQL.test(nodo.expression.expression.getText()) && nodo.arguments.length > 0) {
      encontradas.push(nodo);
    }
  });
  return encontradas;
}

describe("consultas SQL (regla 17, caja blanca)", () => {
  it("encuentra los repositorios que ejecutan SQL (la prueba no es vacía)", () => {
    expect(conSql.map((f) => f.ruta).filter((r) => r.includes("Repository.ts")).length).toBeGreaterThanOrEqual(6);
  });

  it.each(conSql.map((f) => [f.ruta, f] as const))("%s: el texto SQL nunca se arma concatenando", (_ruta, fuente) => {
    for (const llamada of llamadasSql(fuente)) {
      const texto = llamada.arguments[0];
      const permitido =
        ts.isStringLiteral(texto) || ts.isNoSubstitutionTemplateLiteral(texto) || ts.isTemplateExpression(texto) || ts.isIdentifier(texto);
      expect(permitido, `${fuente.ruta}: ${llamada.expression.getText()}(${texto.getText().slice(0, 60)}...) arma SQL con una expresión`).toBe(true);
    }
  });

  it.each(conSql.map((f) => [f.ruta, f] as const))("%s: solo interpola fragmentos SQL fijos, nunca datos", (_ruta, fuente) => {
    const arbol = analizar(fuente.texto, fuente.ruta);
    recorrerNodos(arbol, (nodo) => {
      if (!ts.isTemplateExpression(nodo)) return;
      // Las plantillas que arman mensajes de error no son SQL.
      if (/^`(El rol|La cuenta|El |No )/.test(nodo.getText())) return;
      // `patron` es el valor de un LIKE: viaja como parámetro (se comprueba en otra prueba), no es SQL.
      if (ts.isVariableDeclaration(nodo.parent) && nodo.parent.name.getText() === "patron") return;
      for (const tramo of nodo.templateSpans) {
        const expresion = tramo.expression.getText();
        const permitida = INTERPOLACIONES_PERMITIDAS.some((patron) => patron.test(expresion));
        expect(permitida, `${fuente.ruta}: interpola "${expresion}" en una consulta; usa un parámetro (?) o agrégalo a la lista revisada`).toBe(true);
      }
    });
  });

  it.each(conSql.map((f) => [f.ruta, f] as const))("%s: las cláusulas armadas dinámicamente (condiciones.push) son literales", (_ruta, fuente) => {
    recorrerNodos(analizar(fuente.texto, fuente.ruta), (nodo) => {
      if (!ts.isCallExpression(nodo) || !ts.isPropertyAccessExpression(nodo.expression)) return;
      if (nodo.expression.expression.getText() !== "condiciones" || nodo.expression.name.text !== "push") return;
      for (const argumento of nodo.arguments) {
        expect(ts.isStringLiteral(argumento) || ts.isNoSubstitutionTemplateLiteral(argumento), `${fuente.ruta}: condiciones.push(${argumento.getText()})`).toBe(true);
      }
    });
  });

  it("los valores del usuario en un LIKE se escapan y viajan como parámetro", () => {
    for (const fuente of conSql.filter((f) => f.texto.includes("escaparLike"))) {
      expect(fuente.texto, fuente.ruta).toMatch(/const patron = `%\$\{escaparLike\(filtros\.q\)\}%`/);
      expect(fuente.texto, fuente.ruta).toMatch(/valores\.push\(patron(?:, patron)+\)/);
    }
  });

  it("solo la capa de infraestructura habla con la base: ningún caso de uso ni controlador importa mysql2", () => {
    const infractores = fuentesDeProduccion().filter((f) => /from "mysql2/.test(f.texto) && !/^src\/shared\/infrastructure\//.test(f.ruta));
    expect(infractores.map((f) => f.ruta)).toEqual([]);
  });

  it("ninguna consulta usa SELECT * (no se filtran columnas nuevas por descuido)", () => {
    for (const fuente of conSql) {
      // La consulta de la regla 8 lista sus columnas; `COUNT(*)` sí es válido.
      expect(fuente.texto.replace(/COUNT\(\*\)/g, ""), fuente.ruta).not.toMatch(/SELECT\s+\*/i);
    }
  });
});
