import { describe, expect, it } from "vitest";
import { LIMITE_MAXIMO } from "@/api/http/paginacion";
import {
  EsquemaAsignarProductosBody,
  EsquemaCrearDescuentoBody,
  EsquemaEditarDescuentoBody,
  EsquemaMisDescuentosQuery,
  EsquemaQuitarProductoParams,
} from "./descuentos";
import { EsquemaCrearProductoForm, EsquemaEditarProductoBody, EsquemaMarketplaceQuery } from "./productos";

const ID = "0f7d3b6a-1111-4a2b-8c3d-9e0f1a2b3c4d";

describe("EsquemaCrearProductoForm", () => {
  it("acepta lo mínimo; convierte el precio y las marcas de texto", () => {
    const datos = EsquemaCrearProductoForm.parse({ nombre: "Torta", precio: "25.50", mostrar_precio: "false" });

    expect(datos).toMatchObject({ precio: 25.5, mostrar_precio: false });
    expect(EsquemaCrearProductoForm.parse({ nombre: "Torta" }).precio).toBeUndefined();
  });

  it.each(["0", "0.5", "99999999.99", "120"])("acepta el precio %s", (precio) => {
    expect(EsquemaCrearProductoForm.safeParse({ nombre: "Torta", precio }).success).toBe(true);
  });

  it.each(["-1", "12,50", "12.345", "abc", "100000000", "", "1e3", ".5"])("rechaza el precio %j", (precio) => {
    expect(EsquemaCrearProductoForm.safeParse({ nombre: "Torta", precio }).success).toBe(false);
  });

  it("acepta un nombre con tildes/ñ en el mínimo de 3 caracteres", () => {
    expect(EsquemaCrearProductoForm.safeParse({ nombre: "Café" }).success).toBe(true);
  });

  it.each([
    ["campo desconocido", { activo: "true" }],
    ["nombre vacío", { nombre: " " }],
    ["nombre corto", { nombre: "ab" }],
    ["nombre sin letras", { nombre: "12345" }],
    ["nombre largo", { nombre: "a".repeat(151) }],
    ["descripción larga", { descripcion: "a".repeat(2001) }],
    ["perfil_id inválido", { perfil_id: "x" }],
    ["marca inválida", { mostrar_precio: "si" }],
  ])("rechaza %s", (_caso, parche) => {
    expect(EsquemaCrearProductoForm.safeParse({ nombre: "Torta", ...parche }).success).toBe(false);
  });
});

describe("EsquemaEditarProductoBody", () => {
  it("acepta un campo, precio null (quitarlo) y activo", () => {
    expect(EsquemaEditarProductoBody.safeParse({ nombre: "Nuevo" }).success).toBe(true);
    expect(EsquemaEditarProductoBody.safeParse({ precio: null }).success).toBe(true);
    expect(EsquemaEditarProductoBody.safeParse({ activo: true }).success).toBe(true);
    expect(EsquemaEditarProductoBody.safeParse({ precio: 0 }).success).toBe(true);
  });

  it("rechaza cuerpo vacío, campos ajenos, precios inválidos y tipos incorrectos", () => {
    expect(EsquemaEditarProductoBody.safeParse({}).success).toBe(false);
    expect(EsquemaEditarProductoBody.safeParse({ perfil_id: ID }).success).toBe(false);
    expect(EsquemaEditarProductoBody.safeParse({ imagen_key: "x" }).success).toBe(false);
    expect(EsquemaEditarProductoBody.safeParse({ precio: -1 }).success).toBe(false);
    expect(EsquemaEditarProductoBody.safeParse({ precio: 12.345 }).success).toBe(false);
    expect(EsquemaEditarProductoBody.safeParse({ precio: "12" }).success).toBe(false);
  });
});

describe("EsquemaMarketplaceQuery", () => {
  it("admite filtros y aplica la paginación por defecto", () => {
    expect(EsquemaMarketplaceQuery.parse({ rubro_id: ID, q: " torta " })).toMatchObject({ pagina: 1, limite: 20, rubro_id: ID, q: "torta" });
    expect(EsquemaMarketplaceQuery.safeParse({ perfil_id: "x" }).success).toBe(false);
    expect(EsquemaMarketplaceQuery.safeParse({ limite: String(LIMITE_MAXIMO + 1) }).success).toBe(false);
  });
});

describe("EsquemaCrearDescuentoBody y EsquemaEditarDescuentoBody", () => {
  it("acepta un porcentaje solo, o con fechas (null = sin fecha)", () => {
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje: 15 }).success).toBe(true);
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje: 15, fecha_inicio: "2026-12-01", fecha_fin: null }).success).toBe(true);
    expect(EsquemaEditarDescuentoBody.safeParse({ fecha_fin: null }).success).toBe(true);
  });

  it.each([0, -5, 100.01, 12.345, "15"])("rechaza el porcentaje %j", (porcentaje) => {
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje }).success).toBe(false);
  });

  it("el detalle admite hasta 280 caracteres, vacío o null, y recorta los espacios", () => {
    expect(EsquemaCrearDescuentoBody.parse({ porcentaje: 10, descripcion: "  Día de la Madre  " }).descripcion).toBe("Día de la Madre");
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje: 10, descripcion: "a".repeat(280) }).success).toBe(true);
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje: 10, descripcion: "" }).success).toBe(true);
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje: 10, descripcion: null }).success).toBe(true);
    expect(EsquemaEditarDescuentoBody.safeParse({ descripcion: null }).success).toBe(true);
    expect(EsquemaEditarDescuentoBody.safeParse({ descripcion: "Solo el detalle" }).success).toBe(true);
  });

  it("rechaza un detalle de más de 280 caracteres, con un mensaje claro, o que no sea texto", () => {
    const largo = EsquemaCrearDescuentoBody.safeParse({ porcentaje: 10, descripcion: "a".repeat(281) });

    expect(largo.success).toBe(false);
    expect(JSON.stringify(largo.error?.issues)).toContain("El detalle no puede superar los 280 caracteres.");
    expect(EsquemaEditarDescuentoBody.safeParse({ descripcion: "a".repeat(281) }).success).toBe(false);
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje: 10, descripcion: "a".repeat(10_000) }).success).toBe(false);
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje: 10, descripcion: 123 }).success).toBe(false);
  });

  it("rechaza campos ajenos, fechas vacías y cuerpos de edición vacíos", () => {
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje: 10, tipo: "monto" }).success).toBe(false);
    expect(EsquemaCrearDescuentoBody.safeParse({ porcentaje: 10, fecha_inicio: "" }).success).toBe(false);
    expect(EsquemaEditarDescuentoBody.safeParse({}).success).toBe(false);
  });
});

describe("EsquemaAsignarProductosBody y EsquemaQuitarProductoParams", () => {
  it("exige entre 1 y 50 ids UUID", () => {
    expect(EsquemaAsignarProductosBody.safeParse({ producto_ids: [ID] }).success).toBe(true);
    expect(EsquemaAsignarProductosBody.safeParse({ producto_ids: [] }).success).toBe(false);
    expect(EsquemaAsignarProductosBody.safeParse({ producto_ids: ["x"] }).success).toBe(false);
    expect(EsquemaAsignarProductosBody.safeParse({ producto_ids: Array(51).fill(ID) }).success).toBe(false);
    expect(EsquemaAsignarProductosBody.safeParse({ producto_ids: [ID], perfil_id: ID }).success).toBe(false);
  });

  it("los dos ids de la ruta deben ser UUID", () => {
    expect(EsquemaQuitarProductoParams.safeParse({ id: ID, producto_id: ID }).success).toBe(true);
    expect(EsquemaQuitarProductoParams.safeParse({ id: ID, producto_id: "1; DROP" }).success).toBe(false);
  });
});

describe("EsquemaMisDescuentosQuery (filtro por estado, regla 8)", () => {
  it("sin estado, la consulta queda sin filtro", () => {
    expect(EsquemaMisDescuentosQuery.parse({}).estado).toBeUndefined();
  });

  it.each(["programado", "vigente", "vencido"])("acepta estado=%s junto con la paginación", (estado) => {
    expect(EsquemaMisDescuentosQuery.parse({ estado, pagina: "2", limite: "5" })).toMatchObject({ estado, pagina: 2, limite: 5 });
  });

  it("rechaza un estado desconocido (por ejemplo los de los productos o cuentas)", () => {
    for (const estado of ["activo", "inactivo", "expirado", "", "vigente; DROP TABLE descuentos"]) {
      expect(EsquemaMisDescuentosQuery.safeParse({ estado }).success, estado).toBe(false);
    }
  });
});
