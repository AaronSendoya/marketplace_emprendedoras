import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { AUTENTICADO, esquemaPagina, respuestasDeError } from "../componentes";
import { esquemaPaginacion } from "@/api/http/paginacion";
import { EsquemaEmail, EsquemaPasswordNueva, EsquemaUsuario } from "./auth";
import { EsquemaDescuentosPagina, EsquemaMisDescuentosQuery } from "./descuentos";
import { EsquemaPerfil } from "./perfiles";
import { EsquemaMisProductosPagina, EsquemaMisProductosQuery } from "./productos";

const nombre = (maximo: number) => z.string().trim().min(1).max(maximo);

// El cuerpo no admite `rol` ni `rol_id` (.strict()): el backend siempre inyecta Emprendedor (regla
// 5). Tampoco pide `codigo`: el alta ya no usa OTP (regla 15, el código es solo para recuperar
// contraseña); el correo queda sin verificar hasta el primer OTP que complete esa cuenta.
export const EsquemaCrearUsuarioBody = z
  .object({
    email: EsquemaEmail.meta({ example: "emprendedora@gmail.com" }),
    nombres: nombre(100).meta({ example: "María Elena" }),
    apellido_paterno: nombre(50).meta({ example: "Flores" }),
    apellido_materno: nombre(50).nullish().meta({ description: "Opcional: no todas las personas lo tienen (regla 10).", example: "Choque" }),
    password: EsquemaPasswordNueva.optional().meta({
      description: "Contraseña inicial. Si falta, el sistema genera una temporal y la devuelve una sola vez.",
    }),
  })
  .strict();

export const EsquemaEstadoBody = z.object({ activo: z.boolean() }).strict();

// Regla 5: eliminar una cuenta es irreversible, así que el Admin escribe el correo de la cuenta para confirmarlo. Sin distinguir
// mayúsculas; si no coincide, 400 y no se borra nada.
export const EsquemaEliminarCuentaBody = z
  .object({
    confirmacion_email: z.string().trim().min(1).max(150).meta({ description: "El correo de la cuenta, escrito por el Admin.", example: "emprendedora@gmail.com" }),
  })
  .strict();

const EsquemaCuentaEliminada = z
  .object({
    perfiles: z.number().int().meta({ description: "Perfiles eliminados (0 o 1).", example: 1 }),
    productos: z.number().int().meta({ example: 6 }),
    descuentos: z.number().int().meta({ example: 2 }),
    clics: z.number().int().meta({ description: "Clics de contacto eliminados.", example: 120 }),
    imagenes: z.number().int().meta({ description: "Imágenes borradas de R2 (nunca las predeterminadas).", example: 8 }),
  })
  .meta({ id: "CuentaEliminada" });

// Regla 5: edición sin OTP. Todos los campos son opcionales (solo se cambia lo presente); un
// cuerpo vacío es un no-op válido, no un error.
export const EsquemaEditarUsuarioBody = z
  .object({
    email: EsquemaEmail.optional().meta({ description: "Cambiarlo lo deja sin verificar hasta el próximo OTP (regla 15).", example: "nuevo-correo@gmail.com" }),
    nombres: nombre(100).optional().meta({ example: "María Elena" }),
    apellido_paterno: nombre(50).optional().meta({ example: "Flores" }),
    apellido_materno: nombre(50).nullish().meta({ description: "`null` la quita (regla 10).", example: "Choque" }),
  })
  .strict();

// Regla 5 y 15: el Admin restablece la contraseña de cualquier cuenta sin OTP.
export const EsquemaRestablecerPasswordAdminBody = z
  .object({
    password: EsquemaPasswordNueva.optional().meta({
      description: "Contraseña nueva. Si falta, el sistema genera una temporal y la devuelve una sola vez.",
    }),
  })
  .strict();

export const EsquemaIdUsuario = z.object({
  id: z.uuid().meta({ description: "Id de la cuenta.", example: "0f7d3b6a-1111-4a2b-8c3d-9e0f1a2b3c4d" }),
});

export const EsquemaListarUsuariosQuery = esquemaPaginacion.extend({
  q: z.string().trim().min(1).max(100).optional().meta({ description: "Texto a buscar en nombres, apellidos y correo." }),
  estado: z.enum(["activo", "inactivo"]).optional().meta({ description: "Filtra por estado de la cuenta." }),
});

const EsquemaUsuarioCreado = z
  .object({
    usuario: EsquemaUsuario,
    password_temporal: z.string().nullable().meta({
      description: "Solo si el sistema la generó; se devuelve esta única vez. Nulo si el Admin definió la contraseña.",
      example: "Kp7mQx4Rw2Ht",
    }),
  })
  .meta({ id: "UsuarioCreado" });

export function registrarAdminUsuarios(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "post",
    path: "/admin/usuarios",
    tags: ["Admin"],
    summary: "Crear una cuenta de Emprendedor",
    description:
      "Solo Admin (regla 5). El rol siempre es Emprendedor; un cuerpo con `rol` o `rol_id` da 400. No pide OTP " +
      "(regla 15): el correo queda sin verificar (`email_verificado_en` nulo) hasta el primer código que complete " +
      "esa cuenta. Si el correo ya tiene cuenta, 409. La respuesta no se guarda en caché porque puede traer la " +
      "contraseña temporal.",
    security: AUTENTICADO,
    request: { body: { content: { "application/json": { schema: EsquemaCrearUsuarioBody } } } },
    responses: {
      201: { description: "Cuenta creada.", content: { "application/json": { schema: EsquemaUsuarioCreado } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "CONFLICTO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/usuarios",
    tags: ["Admin"],
    summary: "Listar cuentas",
    description:
      "Todas las cuentas (Admin y Emprendedor), las más recientes primero. Paginado; admite buscar por texto " +
      "libre (`q`, sobre nombres, apellidos y correo, sin distinguir mayúsculas) y filtrar por estado (`estado`).",
    security: AUTENTICADO,
    request: { query: EsquemaListarUsuariosQuery },
    responses: {
      200: { description: "Página de cuentas.", content: { "application/json": { schema: esquemaPagina(EsquemaUsuario, "UsuariosPagina") } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/admin/usuarios/{id}/estado",
    tags: ["Admin"],
    summary: "Activar o desactivar una cuenta",
    description:
      "Desactivar no borra nada: la cuenta pierde el acceso en su siguiente petición, aunque su token siga vigente " +
      "(regla 5). Un Admin no puede desactivar su propia cuenta (409). Es idempotente.",
    security: AUTENTICADO,
    request: {
      params: EsquemaIdUsuario,
      body: { content: { "application/json": { schema: EsquemaEstadoBody } } },
    },
    responses: {
      200: { description: "Cuenta con su estado actual.", content: { "application/json": { schema: EsquemaUsuario } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO", "CONFLICTO"),
    },
  });

  registro.registerPath({
    method: "delete",
    path: "/admin/usuarios/{id}",
    tags: ["Admin"],
    summary: "Eliminar una cuenta por completo",
    description:
      "Irreversible (regla 5). Distinta de desactivar y no la sustituye. Solo se elimina una cuenta de Emprendedor **activa**: " +
      "una suspendida da 409 (se activa primero), una de Admin da 403 y la propia cuenta del Admin da 409. El cuerpo lleva " +
      "`confirmacion_email`, el correo de la cuenta; si no coincide, 400 y no se borra nada. Borra, en una sola transacción, su " +
      "perfil, sus productos, sus descuentos y las asignaciones entre ambos, todos sus clics de contacto (también dejan de " +
      "contar en las métricas, regla 19), los códigos OTP y los intentos de acceso de su correo, y la cuenta; después borra de " +
      "R2 sus imágenes (nunca las predeterminadas). La persona pierde el acceso en su siguiente petición y su correo queda libre.",
    security: AUTENTICADO,
    request: {
      params: EsquemaIdUsuario,
      body: { content: { "application/json": { schema: EsquemaEliminarCuentaBody } } },
    },
    responses: {
      200: { description: "Lo que se eliminó junto con la cuenta.", content: { "application/json": { schema: EsquemaCuentaEliminada } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO", "CONFLICTO"),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/admin/usuarios/{id}",
    tags: ["Admin"],
    summary: "Editar una cuenta",
    description:
      "Nombres, apellidos y correo, sin OTP (regla 5 y 15). El rol nunca se edita por la API. Cambiar el correo lo " +
      "deja sin verificar hasta el próximo OTP que la cuenta complete. Un cuerpo vacío no cambia nada. 409 si el " +
      "correo nuevo ya tiene otra cuenta.",
    security: AUTENTICADO,
    request: {
      params: EsquemaIdUsuario,
      body: { content: { "application/json": { schema: EsquemaEditarUsuarioBody } } },
    },
    responses: {
      200: { description: "Cuenta editada.", content: { "application/json": { schema: EsquemaUsuario } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO", "CONFLICTO"),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/admin/usuarios/{id}/password",
    tags: ["Admin"],
    summary: "Restablecer la contraseña de una cuenta",
    description:
      "El Admin cambia la contraseña de cualquier cuenta directamente, sin OTP (regla 5 y 15: el OTP es solo para " +
      "que la propia Emprendedora se recupere). Si no se envía `password`, el sistema genera una temporal y la " +
      "devuelve una sola vez. Cierra las demás sesiones de esa cuenta (regla 5).",
    security: AUTENTICADO,
    request: {
      params: EsquemaIdUsuario,
      body: { content: { "application/json": { schema: EsquemaRestablecerPasswordAdminBody } } },
    },
    responses: {
      200: { description: "Cuenta con la contraseña restablecida.", content: { "application/json": { schema: EsquemaUsuarioCreado } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/usuarios/{id}",
    tags: ["Admin"],
    summary: "Ver una cuenta",
    description: "Datos básicos de una cuenta (sin la contraseña). Base del módulo \"Emprendimientos\" del panel.",
    security: AUTENTICADO,
    request: { params: EsquemaIdUsuario },
    responses: {
      200: { description: "Cuenta.", content: { "application/json": { schema: EsquemaUsuario } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/usuarios/{id}/perfil",
    tags: ["Admin"],
    summary: "Ver el perfil de una cuenta",
    description:
      "Mismo caso de uso que `GET /mis/perfil`, pero para el `usuario_id` que indique el Admin (módulo " +
      "\"Emprendimientos\"). `404` si esa cuenta todavía no tiene perfil.",
    security: AUTENTICADO,
    request: { params: EsquemaIdUsuario },
    responses: {
      200: { description: "Perfil de la cuenta.", content: { "application/json": { schema: EsquemaPerfil } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/usuarios/{id}/productos",
    tags: ["Admin"],
    summary: "Ver los productos de una cuenta",
    description:
      "Mismo caso de uso que `GET /mis/productos` (activos o no, con el precio real), pero para el `usuario_id` que " +
      "indique el Admin (módulo \"Emprendimientos\"). Sin perfil, la lista está vacía.",
    security: AUTENTICADO,
    request: { params: EsquemaIdUsuario, query: EsquemaMisProductosQuery },
    responses: {
      200: { description: "Página de productos.", content: { "application/json": { schema: EsquemaMisProductosPagina } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/usuarios/{id}/descuentos",
    tags: ["Admin"],
    summary: "Ver los descuentos de una cuenta",
    description:
      "Mismo caso de uso que `GET /mis/descuentos`, pero para el `usuario_id` que indique el Admin (módulo " +
      "\"Emprendimientos\"). Sin perfil, la lista está vacía.",
    security: AUTENTICADO,
    request: { params: EsquemaIdUsuario, query: EsquemaMisDescuentosQuery },
    responses: {
      200: { description: "Página de descuentos.", content: { "application/json": { schema: EsquemaDescuentosPagina } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });
}
