import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { DIGITOS_CODIGO_OTP } from "@/core/auth/domain/Otp";
import {
  cumplePoliticaPassword,
  MENSAJE_POLITICA_PASSWORD,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_CARACTERES,
} from "@/core/auth/domain/Password";
import { ROLES } from "@/core/auth/domain/Rol";
import { AUTENTICADO, PUBLICO, respuestasDeError } from "../componentes";

// La misma fuente valida la entrada (route.ts) y documenta la especificación.
export const EsquemaLoginBody = z
  .object({
    email: z.email().max(150).meta({ example: "admin@gmail.com" }),
    // Tope generoso: bcrypt solo mira los primeros 72 bytes; el límite evita procesar entradas enormes.
    password: z.string().min(1).max(200).meta({ example: "••••••••" }),
  })
  .strict();

export const EsquemaUsuario = z
  .object({
    id: z.string().meta({ example: "0f7d3b6a-1111-4a2b-8c3d-9e0f1a2b3c4d" }),
    email: z.email().meta({ example: "admin@gmail.com" }),
    nombres: z.string().meta({ example: "Administrador" }),
    apellido_paterno: z.string().meta({ example: "General" }),
    apellido_materno: z.string().nullable().meta({ example: null }),
    nombre_completo: z.string().meta({ description: "Derivado; no se guarda en la base (regla 10).", example: "Administrador General" }),
    rol: z.enum(ROLES),
    activo: z.boolean(),
    email_verificado_en: z.iso.datetime().nullable(),
    creado_en: z.iso.datetime(),
  })
  .meta({ id: "Usuario" });

const EsquemaLoginRespuesta = z
  .object({
    token: z.string().meta({ description: "JWT. Pegar aquí en el botón Authorize de Swagger (sin 'Bearer')." }),
    usuario: EsquemaUsuario,
  })
  .meta({ id: "LoginRespuesta" });

export const EsquemaEmail = z.email().max(150);

// Regla 15: 8 caracteres como mínimo y 72 bytes como máximo (el límite de bcrypt). Reutilizable por
// el alta de cuentas (paso 9).
export const EsquemaPasswordNueva = z
  .string()
  // min y max dan los límites a OpenAPI; `abort` evita repetir el mismo mensaje con el refine (bytes).
  .min(PASSWORD_MIN_CARACTERES, { error: MENSAJE_POLITICA_PASSWORD, abort: true })
  .max(PASSWORD_MAX_BYTES, { error: MENSAJE_POLITICA_PASSWORD, abort: true })
  .refine(cumplePoliticaPassword, MENSAJE_POLITICA_PASSWORD)
  .meta({ example: "MiClaveNueva2026" });

export const EsquemaCodigoOtp = z
  .string()
  .length(DIGITOS_CODIGO_OTP, `El código tiene ${DIGITOS_CODIGO_OTP} dígitos.`)
  .regex(new RegExp(`^\\d{${DIGITOS_CODIGO_OTP}}$`), `El código tiene ${DIGITOS_CODIGO_OTP} dígitos.`)
  .meta({ example: "482913" });

export const EsquemaSolicitarCodigoPasswordBody = z
  .object({ email: EsquemaEmail.meta({ example: "aaron@gmail.com" }) })
  .strict();

export const EsquemaRestablecerPasswordBody = z
  .object({
    email: EsquemaEmail.meta({ example: "aaron@gmail.com" }),
    codigo: EsquemaCodigoOtp,
    password_nueva: EsquemaPasswordNueva,
  })
  .strict();

export const EsquemaSolicitarCodigoEmailBody = z
  .object({ email_nuevo: EsquemaEmail.meta({ example: "nuevo@gmail.com" }) })
  .strict();

export const EsquemaCambiarEmailBody = z
  .object({ email_nuevo: EsquemaEmail.meta({ example: "nuevo@gmail.com" }), codigo: EsquemaCodigoOtp })
  .strict();

export const EsquemaMensaje = z.object({ mensaje: z.string() }).meta({ id: "Mensaje" });

export function registrarAuth(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "post",
    path: "/auth/login",
    tags: ["Autenticación"],
    summary: "Iniciar sesión",
    description:
      "Da el mismo error ante un correo inexistente o una contraseña incorrecta, y ante una cuenta desactivada " +
      "(regla 5). Tras 5 intentos fallidos con el mismo correo en 15 minutos, responde 429 sin comparar la " +
      "contraseña (regla 17); revisa la cabecera `Retry-After`.",
    security: PUBLICO,
    request: { body: { content: { "application/json": { schema: EsquemaLoginBody } } } },
    responses: {
      200: { description: "Token y datos del usuario.", content: { "application/json": { schema: EsquemaLoginRespuesta } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "DEMASIADAS_SOLICITUDES"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/auth/me",
    tags: ["Autenticación"],
    summary: "Usuario autenticado",
    description: "El rol y el estado (`activo`) siempre se leen de la base en el momento de la petición (regla 5).",
    security: AUTENTICADO,
    responses: {
      200: { description: "Datos del usuario autenticado.", content: { "application/json": { schema: EsquemaUsuario } } },
      ...respuestasDeError("NO_AUTENTICADO"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/auth/password/solicitar-codigo",
    tags: ["Autenticación"],
    summary: "Solicitar el código para restablecer la contraseña",
    description:
      "Responde igual exista o no la cuenta (regla 15): el código solo se envía si la cuenta existe y está " +
      "activa. Máximo 1 solicitud por minuto y 5 por hora por correo; al superarlo, 429 con `Retry-After`. " +
      "En desarrollo el código aparece en la consola del servidor.",
    security: PUBLICO,
    request: { body: { content: { "application/json": { schema: EsquemaSolicitarCodigoPasswordBody } } } },
    responses: {
      200: { description: "Solicitud registrada.", content: { "application/json": { schema: EsquemaMensaje } } },
      ...respuestasDeError("VALIDACION", "DEMASIADAS_SOLICITUDES"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/auth/password/restablecer",
    tags: ["Autenticación"],
    summary: "Restablecer la contraseña con el código",
    description:
      "El código vale 10 minutos, se usa una sola vez y admite 5 intentos. Un código incorrecto, vencido, usado o " +
      "sin intentos da el mismo error 400. Al restablecer se cierran las demás sesiones (`token_version`, regla 5) " +
      "y el correo queda verificado.",
    security: PUBLICO,
    request: { body: { content: { "application/json": { schema: EsquemaRestablecerPasswordBody } } } },
    responses: {
      200: { description: "Contraseña actualizada.", content: { "application/json": { schema: EsquemaMensaje } } },
      ...respuestasDeError("VALIDACION"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/auth/email/solicitar-codigo",
    tags: ["Autenticación"],
    summary: "Solicitar el código para cambiar el correo",
    description: "El código se envía al correo nuevo. Mismos límites de solicitudes que la recuperación de contraseña.",
    security: AUTENTICADO,
    request: { body: { content: { "application/json": { schema: EsquemaSolicitarCodigoEmailBody } } } },
    responses: {
      200: { description: "Código enviado.", content: { "application/json": { schema: EsquemaMensaje } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "DEMASIADAS_SOLICITUDES"),
    },
  });

  registro.registerPath({
    method: "put",
    path: "/auth/email",
    tags: ["Autenticación"],
    summary: "Cambiar el correo con el código",
    description:
      "Confirma el código enviado al correo nuevo. El correo cambia y queda verificado; no cierra sesiones. " +
      "409 si otra cuenta ya usa ese correo.",
    security: AUTENTICADO,
    request: { body: { content: { "application/json": { schema: EsquemaCambiarEmailBody } } } },
    responses: {
      200: { description: "Datos actualizados del usuario.", content: { "application/json": { schema: EsquemaUsuario } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "CONFLICTO"),
    },
  });
}
