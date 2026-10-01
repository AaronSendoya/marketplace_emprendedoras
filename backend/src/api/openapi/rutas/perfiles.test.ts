import { describe, expect, it } from "vitest";
import { LIMITE_MAXIMO } from "@/api/http/paginacion";
import { EsquemaCrearPerfilForm, EsquemaEditarPerfilBody, EsquemaImagenForm, EsquemaListarPerfilesQuery } from "./perfiles";

const ID = "0f7d3b6a-1111-4a2b-8c3d-9e0f1a2b3c4d";
const valido = { nombre_negocio: "Dulces de Ana", descripcion: "Postres", whatsapp: "71234567", ciudad_id: ID, rubro_id: ID };

describe("EsquemaCrearPerfilForm", () => {
  it("acepta lo mínimo y convierte las marcas de texto a booleano", () => {
    const datos = EsquemaCrearPerfilForm.parse({ ...valido, usar_foto_predeterminada: "true", usar_logo_predeterminado: "false" });

    expect(datos.usar_foto_predeterminada).toBe(true);
    expect(datos.usar_logo_predeterminado).toBe(false);
  });

  it.each([
    ["campo desconocido", { rol: "Admin" }],
    ["nombre vacío", { nombre_negocio: "  " }],
    ["nombre de más de 150", { nombre_negocio: "a".repeat(151) }],
    ["descripción de más de 2000", { descripcion: "a".repeat(2001) }],
    ["ciudad que no es UUID", { ciudad_id: "1; DROP TABLE" }],
    ["usuario_id que no es UUID", { usuario_id: "abc" }],
    ["marca que no es true/false", { usar_foto_predeterminada: "si" }],
  ])("rechaza %s", (_caso, parche) => {
    expect(EsquemaCrearPerfilForm.safeParse({ ...valido, ...parche }).success).toBe(false);
  });

  it("recorta los espacios de los textos", () => {
    expect(EsquemaCrearPerfilForm.parse({ ...valido, nombre_negocio: "  Dulces  " }).nombre_negocio).toBe("Dulces");
  });
});

describe("EsquemaEditarPerfilBody", () => {
  it("acepta un solo campo y admite instagram null", () => {
    expect(EsquemaEditarPerfilBody.safeParse({ nombre_negocio: "Nuevo" }).success).toBe(true);
    expect(EsquemaEditarPerfilBody.safeParse({ instagram: null }).success).toBe(true);
    expect(EsquemaEditarPerfilBody.safeParse({ otra_red_social: null }).success).toBe(true);
    expect(EsquemaEditarPerfilBody.safeParse({ otra_red_social: "x".repeat(51) }).success).toBe(false);
  });

  it("rechaza un cuerpo vacío, campos no editables y los ids inválidos", () => {
    expect(EsquemaEditarPerfilBody.safeParse({}).success).toBe(false);
    expect(EsquemaEditarPerfilBody.safeParse({ usuario_id: ID }).success).toBe(false);
    expect(EsquemaEditarPerfilBody.safeParse({ foto_perfil_key: "x" }).success).toBe(false);
    expect(EsquemaEditarPerfilBody.safeParse({ ciudad_id: "no" }).success).toBe(false);
  });
});

describe("otros esquemas", () => {
  it("el formulario de imagen solo admite la marca", () => {
    expect(EsquemaImagenForm.parse({ usar_predeterminada: "true" }).usar_predeterminada).toBe(true);
    expect(EsquemaImagenForm.safeParse({ otro: "x" }).success).toBe(false);
  });

  it("la consulta del feed admite filtros y aplica la paginación por defecto", () => {
    expect(EsquemaListarPerfilesQuery.parse({ ciudad_id: ID, q: " tienda " })).toMatchObject({ pagina: 1, limite: 20, ciudad_id: ID, q: "tienda" });
    expect(EsquemaListarPerfilesQuery.safeParse({ ciudad_id: "x" }).success).toBe(false);
    expect(EsquemaListarPerfilesQuery.safeParse({ q: "" }).success).toBe(false);
    expect(EsquemaListarPerfilesQuery.safeParse({ limite: String(LIMITE_MAXIMO + 1) }).success).toBe(false);
  });
});
