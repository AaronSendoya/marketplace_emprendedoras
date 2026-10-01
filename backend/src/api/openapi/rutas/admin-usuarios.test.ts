import { describe, expect, it } from "vitest";
import {
  EsquemaCrearUsuarioBody,
  EsquemaEditarUsuarioBody,
  EsquemaEstadoBody,
  EsquemaIdUsuario,
  EsquemaListarUsuariosQuery,
  EsquemaRestablecerPasswordAdminBody,
} from "./admin-usuarios";

const valido = { email: "nueva@gmail.com", nombres: "María Elena", apellido_paterno: "Flores" };

describe("EsquemaCrearUsuarioBody (regla 5)", () => {
  it("acepta el cuerpo mínimo, con o sin apellido materno y contraseña", () => {
    expect(EsquemaCrearUsuarioBody.safeParse(valido).success).toBe(true);
    expect(EsquemaCrearUsuarioBody.safeParse({ ...valido, apellido_materno: null }).success).toBe(true);
    expect(EsquemaCrearUsuarioBody.safeParse({ ...valido, apellido_materno: "Choque", password: "ClaveInicial2026" }).success).toBe(true);
  });

  it.each(["rol", "rol_id", "activo", "token_version", "codigo"])("rechaza el campo %s: no forman parte del alta", (campo) => {
    const resultado = EsquemaCrearUsuarioBody.safeParse({ ...valido, [campo]: "Admin" });

    expect(resultado.success).toBe(false);
  });

  it.each([
    ["nombres vacío", { nombres: "   " }],
    ["nombres de más de 100 caracteres", { nombres: "a".repeat(101) }],
    ["apellido paterno de más de 50", { apellido_paterno: "a".repeat(51) }],
    ["apellido materno de más de 50", { apellido_materno: "a".repeat(51) }],
    ["correo inválido", { email: "no-es-correo" }],
    ["contraseña corta", { password: "corta" }],
  ])("rechaza %s", (_caso, parche) => {
    expect(EsquemaCrearUsuarioBody.safeParse({ ...valido, ...parche }).success).toBe(false);
  });

  it("recorta los espacios de los nombres", () => {
    const resultado = EsquemaCrearUsuarioBody.parse({ ...valido, nombres: "  María Elena " });

    expect(resultado.nombres).toBe("María Elena");
  });
});

describe("EsquemaEstadoBody y EsquemaIdUsuario", () => {
  it("el estado es un booleano y no admite otros campos", () => {
    expect(EsquemaEstadoBody.safeParse({ activo: false }).success).toBe(true);
    expect(EsquemaEstadoBody.safeParse({ activo: "false" }).success).toBe(false);
    expect(EsquemaEstadoBody.safeParse({ activo: true, rol: "Admin" }).success).toBe(false);
    expect(EsquemaEstadoBody.safeParse({}).success).toBe(false);
  });

  it("el id debe ser un UUID (acepta el v1 del seed y el v4 de la aplicación)", () => {
    expect(EsquemaIdUsuario.safeParse({ id: "aaa8981f-b616-11f1-91d3-40c2ba97707a" }).success).toBe(true);
    expect(EsquemaIdUsuario.safeParse({ id: crypto.randomUUID() }).success).toBe(true);
    expect(EsquemaIdUsuario.safeParse({ id: "1; DROP TABLE usuarios" }).success).toBe(false);
    expect(EsquemaIdUsuario.safeParse({ id: "123" }).success).toBe(false);
  });
});

describe("EsquemaEditarUsuarioBody (regla 5: edición sin OTP)", () => {
  it("un cuerpo vacío es válido (no-op)", () => {
    expect(EsquemaEditarUsuarioBody.safeParse({}).success).toBe(true);
  });

  it("acepta cualquier subconjunto de campos", () => {
    expect(EsquemaEditarUsuarioBody.safeParse({ nombres: "Nuevo Nombre" }).success).toBe(true);
    expect(EsquemaEditarUsuarioBody.safeParse({ email: "nuevo@gmail.com" }).success).toBe(true);
    expect(EsquemaEditarUsuarioBody.safeParse({ apellido_materno: null }).success).toBe(true);
  });

  it.each(["rol", "rol_id", "activo", "password", "codigo"])("rechaza el campo %s: no se edita por acá", (campo) => {
    expect(EsquemaEditarUsuarioBody.safeParse({ [campo]: "x" }).success).toBe(false);
  });

  it("rechaza un correo inválido o nombres vacíos", () => {
    expect(EsquemaEditarUsuarioBody.safeParse({ email: "no-es-correo" }).success).toBe(false);
    expect(EsquemaEditarUsuarioBody.safeParse({ nombres: "   " }).success).toBe(false);
  });
});

describe("EsquemaRestablecerPasswordAdminBody (regla 5 y 15: sin OTP)", () => {
  it("un cuerpo vacío es válido (el sistema genera una temporal)", () => {
    expect(EsquemaRestablecerPasswordAdminBody.safeParse({}).success).toBe(true);
  });

  it("acepta una contraseña que cumple la política y rechaza una corta", () => {
    expect(EsquemaRestablecerPasswordAdminBody.safeParse({ password: "ClaveNueva2026" }).success).toBe(true);
    expect(EsquemaRestablecerPasswordAdminBody.safeParse({ password: "corta" }).success).toBe(false);
  });

  it.each(["codigo", "email"])("rechaza el campo %s: no pide OTP", (campo) => {
    expect(EsquemaRestablecerPasswordAdminBody.safeParse({ [campo]: "x" }).success).toBe(false);
  });
});

describe("EsquemaListarUsuariosQuery (regla 5: búsqueda y filtro de estado)", () => {
  it("acepta la página sin filtros, y con q y estado", () => {
    expect(EsquemaListarUsuariosQuery.parse({})).toMatchObject({ pagina: 1, limite: 20 });
    expect(EsquemaListarUsuariosQuery.parse({ q: " maría ", estado: "activo" })).toMatchObject({
      pagina: 1,
      limite: 20,
      q: "maría",
      estado: "activo",
    });
  });

  it("rechaza un q vacío y un estado que no sea activo/inactivo", () => {
    expect(EsquemaListarUsuariosQuery.safeParse({ q: "" }).success).toBe(false);
    expect(EsquemaListarUsuariosQuery.safeParse({ estado: "pendiente" }).success).toBe(false);
  });
});
