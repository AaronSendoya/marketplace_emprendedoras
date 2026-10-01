import ts from "typescript";
import { describe, expect, it } from "vitest";
import { analizar, fuentesDeProduccion, recorrerNodos } from "./soporte/fuentes";

// Arquitectura hexagonal estricta (CLAUDE.md, sección 1): las capas internas no conocen a las
// externas. Es una propiedad de seguridad además de mantenibilidad: el dominio no puede tocar la
// base, el disco ni la red, así que un fallo en él no las compromete.
const PAQUETES_DE_INFRAESTRUCTURA = /^(next|next\/.*|react|mysql2|mysql2\/.*|sharp|@aws-sdk\/.*|bcryptjs|jose|nodemailer|node:fs|node:net|node:http|node:https|node:child_process)$/;
const ES_INFRAESTRUCTURA = /(^@\/shared\/infrastructure|^@\/core\/[^/]+\/infrastructure|^@\/api\/)/;

function importaciones(texto: string, ruta: string): string[] {
  const modulos: string[] = [];
  recorrerNodos(analizar(texto, ruta), (nodo) => {
    if (ts.isImportDeclaration(nodo) && ts.isStringLiteral(nodo.moduleSpecifier)) modulos.push(nodo.moduleSpecifier.text);
    if (ts.isExportDeclaration(nodo) && nodo.moduleSpecifier && ts.isStringLiteral(nodo.moduleSpecifier)) modulos.push(nodo.moduleSpecifier.text);
  });
  return modulos;
}

const fuentes = fuentesDeProduccion();
const en = (patron: RegExp) => fuentes.filter((f) => patron.test(f.ruta));

describe("arquitectura hexagonal (caja blanca)", () => {
  it("encuentra las capas (la prueba no es vacía)", () => {
    expect(en(/^src\/core\/[^/]+\/domain\//).length).toBeGreaterThan(15);
    expect(en(/^src\/core\/[^/]+\/application\//).length).toBeGreaterThan(15);
  });

  describe("dominio: reglas puras, sin dependencias externas", () => {
    it.each(en(/^src\/(core\/[^/]+|shared)\/domain\//).map((f) => [f.ruta, f] as const))("%s", (_ruta, fuente) => {
      for (const modulo of importaciones(fuente.texto, fuente.ruta)) {
        expect(PAQUETES_DE_INFRAESTRUCTURA.test(modulo), `${fuente.ruta} importa ${modulo}`).toBe(false);
        expect(ES_INFRAESTRUCTURA.test(modulo), `${fuente.ruta} importa ${modulo}`).toBe(false);
        expect(modulo, `${fuente.ruta} no debe depender de zod (la validación de entrada es de la capa API)`).not.toBe("zod");
      }
    });
  });

  describe("casos de uso: solo hablan con puertos", () => {
    it.each(en(/^src\/core\/[^/]+\/application\//).map((f) => [f.ruta, f] as const))("%s", (_ruta, fuente) => {
      for (const modulo of importaciones(fuente.texto, fuente.ruta)) {
        expect(PAQUETES_DE_INFRAESTRUCTURA.test(modulo), `${fuente.ruta} importa ${modulo}`).toBe(false);
        expect(ES_INFRAESTRUCTURA.test(modulo), `${fuente.ruta} importa ${modulo}`).toBe(false);
      }
    });
  });

  describe("controladores: no conocen la base ni los adaptadores de salida", () => {
    it.each(en(/^src\/api\/controllers\/[^/]+\.ts$/).map((f) => [f.ruta, f] as const))("%s", (_ruta, fuente) => {
      for (const modulo of importaciones(fuente.texto, fuente.ruta)) {
        expect(/^mysql2|infrastructure/.test(modulo), `${fuente.ruta} importa ${modulo}`).toBe(false);
      }
    });
  });

  it("solo la capa de composición (src/api/composicion) y los envoltorios de autenticación cablean adaptadores de salida", () => {
    const permitidas = /^src\/(api\/(composicion|middlewares)\/|app\/|instrumentation\.ts|proxy\.ts)/;
    for (const fuente of en(/^src\/api\//).filter((f) => !permitidas.test(f.ruta) && !/openapi\//.test(f.ruta))) {
      const infraestructura = importaciones(fuente.texto, fuente.ruta).filter((m) => /infrastructure/.test(m));
      expect(infraestructura, fuente.ruta).toEqual([]);
    }
  });

  it("los módulos de negocio no se importan entre sí por la infraestructura (solo por dominio y aplicación)", () => {
    for (const fuente of en(/^src\/core\//)) {
      const propio = /^src\/core\/([^/]+)\//.exec(fuente.ruta)![1];
      for (const modulo of importaciones(fuente.texto, fuente.ruta)) {
        const ajeno = /^@\/core\/([^/]+)\/infrastructure/.exec(modulo);
        if (ajeno && ajeno[1] !== propio) throw new Error(`${fuente.ruta} usa la infraestructura de ${ajeno[1]}`);
      }
    }
  });
});
