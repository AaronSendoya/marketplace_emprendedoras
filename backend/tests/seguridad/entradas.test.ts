import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as admin from "@/api/openapi/rutas/admin-usuarios";
import * as auth from "@/api/openapi/rutas/auth";
import * as descuentos from "@/api/openapi/rutas/descuentos";
import * as perfiles from "@/api/openapi/rutas/perfiles";
import * as productos from "@/api/openapi/rutas/productos";
import { esquemaPaginacion, LIMITE_MAXIMO, PAGINA_MAXIMA } from "@/api/http/paginacion";

// Regla 17: validación estricta de entradas. Se inspeccionan los esquemas Zod (no se ejecutan casos
// a mano) para que un campo nuevo sin límite haga fallar la prueba.
type Definicion = { type: string; innerType?: z.ZodType; in?: z.ZodType; catchall?: z.ZodType; shape?: Record<string, z.ZodType>; element?: z.ZodType; checks?: { _zod: { def: { check: string } } }[]; format?: string };
const definicion = (esquema: z.ZodType) => (esquema as unknown as { _zod: { def: Definicion } })._zod.def;

// Quita optional, nullable, default y transform para llegar al tipo base.
function base(esquema: z.ZodType): z.ZodType {
  const def = definicion(esquema);
  if (def.innerType) return base(def.innerType);
  if (def.type === "pipe" && def.in) return base(def.in);
  return esquema;
}

const modulos = { admin, auth, descuentos, perfiles, productos };
const esquemasNombrados = Object.entries(modulos).flatMap(([modulo, exportados]) =>
  Object.entries(exportados as Record<string, unknown>)
    .filter(([nombre, valor]) => /^Esquema/.test(nombre) && typeof valor === "object" && valor !== null && "_zod" in valor)
    .map(([nombre, valor]) => ({ id: `${modulo}.${nombre}`, nombre, esquema: valor as z.ZodType })),
);

const cuerpos = esquemasNombrados.filter((e) => /(Body|Form)$/.test(e.nombre));
const consultas = esquemasNombrados.filter((e) => /(Query|Params)$/.test(e.nombre) || e.nombre.startsWith("EsquemaId"));

function camposDe(esquema: z.ZodType): [string, z.ZodType][] {
  const def = definicion(esquema);
  return Object.entries(def.shape ?? {});
}

describe("esquemas de entrada (regla 17, caja blanca)", () => {
  it("encuentra los esquemas de los cuerpos (la prueba no es vacía)", () => {
    expect(cuerpos.length).toBeGreaterThanOrEqual(15);
    expect(consultas.length).toBeGreaterThanOrEqual(6);
  });

  it.each(cuerpos.map((e) => [e.id, e.esquema] as const))("%s: es estricto (rechaza campos no definidos, sin asignación masiva)", (_id, esquema) => {
    const catchall = definicion(base(esquema)).catchall;

    expect(catchall && definicion(catchall).type).toBe("never");
  });

  describe.each([...cuerpos, ...consultas].map((e) => [e.id, e.esquema] as const))("%s", (_id, esquema) => {
    const campos = camposDe(base(esquema));

    it("todo campo de texto tiene una longitud máxima (o es un UUID)", () => {
      for (const [nombre, campo] of campos) {
        const interior = base(campo);
        if (definicion(interior).type !== "string") continue;
        const acotado = (interior as z.ZodString).maxLength !== null || (interior as z.ZodString).format === "uuid";
        expect(acotado, `el campo "${nombre}" no limita su longitud`).toBe(true);
      }
    });

    it("todo número tiene un rango con mínimo y máximo", () => {
      for (const [nombre, campo] of campos) {
        const interior = base(campo);
        if (definicion(interior).type !== "number") continue;
        const { minValue, maxValue } = interior as z.ZodNumber;
        expect(minValue !== null && Number.isFinite(minValue), `"${nombre}" sin mínimo`).toBe(true);
        expect(maxValue !== null && Number.isFinite(maxValue), `"${nombre}" sin máximo`).toBe(true);
      }
    });

    it("todo arreglo tiene un máximo de elementos", () => {
      for (const [nombre, campo] of campos) {
        const interior = base(campo);
        if (definicion(interior).type !== "array") continue;
        const conMaximo = definicion(interior).checks?.some((c) => c._zod.def.check === "max_length");
        expect(conMaximo, `"${nombre}" sin máximo de elementos`).toBe(true);
      }
    });
  });
});

describe("paginación acotada", () => {
  it("rechaza un límite mayor al máximo, una página 0 y una página desmesurada", () => {
    expect(esquemaPaginacion.safeParse({ limite: String(LIMITE_MAXIMO + 1) }).success).toBe(false);
    expect(esquemaPaginacion.safeParse({ pagina: "0" }).success).toBe(false);
    expect(esquemaPaginacion.safeParse({ pagina: String(PAGINA_MAXIMA + 1) }).success).toBe(false);
    expect(esquemaPaginacion.safeParse({ pagina: "1e400" }).success).toBe(false);
    expect(esquemaPaginacion.safeParse({ pagina: String(PAGINA_MAXIMA), limite: String(LIMITE_MAXIMO) }).success).toBe(true);
  });
});
