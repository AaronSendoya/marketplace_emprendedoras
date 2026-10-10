import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { AUTENTICADO, respuestasDeError } from "../componentes";

// Regla 17 y regla 22 (2026-10-09): conectar una cuenta de Google para leer las imágenes de Drive al importar. Nada de esto guarda un
// token: el backend solo intercambia el código y devuelve el token de una hora, que el frontend guarda en una cookie httpOnly.

// `state` y el desafío PKCE los genera el frontend: letras, números, guion, punto, guion bajo y tilde (base64url y variantes).
const FORMA_STATE = /^[A-Za-z0-9._~-]{16,128}$/;
const FORMA_DESAFIO = /^[A-Za-z0-9_-]{43,128}$/;
const FORMA_VERIFICADOR = /^[A-Za-z0-9._~-]{43,128}$/;
// Un código de autorización de Google es texto opaco que incluye `/` y `-` (por ejemplo `4/0AX…`).
const FORMA_CODIGO = /^[A-Za-z0-9._~/+=-]{10,2048}$/;

export const EsquemaAutorizacionGoogleQuery = z
  .object({
    state: z.string().regex(FORMA_STATE, "Debe tener entre 16 y 128 caracteres (letras, números y . _ ~ -).").meta({ description: "Valor aleatorio que el frontend vuelve a comprobar al regresar de Google (contra la falsificación de peticiones)." }),
    code_challenge: z
      .string()
      .regex(FORMA_DESAFIO, "Debe ser el desafío PKCE (SHA-256 en base64url).")
      .meta({ description: "Desafío PKCE (S256) del verificador que el frontend guarda; Google solo lo canjea con ese verificador." }),
  })
  .strict();

export const EsquemaConexionGoogleBody = z
  .object({
    codigo: z.string().regex(FORMA_CODIGO, "El código no es válido.").meta({ description: "El código de autorización que devolvió Google." }),
    code_verifier: z.string().regex(FORMA_VERIFICADOR, "El verificador no es válido.").meta({ description: "El verificador PKCE cuyo desafío se mandó a Google." }),
  })
  .strict();

const EsquemaEstadoGoogle = z
  .object({ disponible: z.boolean().meta({ description: "`false` si el servidor no tiene las variables `GOOGLE_*`: el importador funciona sin imágenes de Drive." }) })
  .meta({ id: "EstadoGoogle" });

const EsquemaUrlGoogle = z.object({ url: z.string().meta({ description: "La dirección de Google a la que se manda a la persona para elegir su cuenta." }) }).meta({ id: "UrlGoogle" });

const EsquemaConexionGoogle = z
  .object({
    access_token: z.string().meta({ description: "Token de acceso de solo lectura de Drive. Vale una hora y no se guarda en el servidor." }),
    expira_en: z.number().int().meta({ description: "Segundos que le quedan al token (máximo 3600)." }),
    cuenta: z.string().nullable().meta({ description: "El correo de la cuenta conectada, para que el Admin vea con cuál trabaja." }),
  })
  .meta({ id: "ConexionGoogle" });

export function registrarGoogle(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/admin/google/estado",
    tags: ["Importaciones"],
    summary: "¿Está configurada la conexión con Google?",
    description: "Solo Admin (regla 22). Dice si el servidor tiene configurada la conexión con Google (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`). Sin ella, el importador no ofrece conectar.",
    security: AUTENTICADO,
    responses: {
      200: { description: "Estado de la configuración.", content: { "application/json": { schema: EsquemaEstadoGoogle } } },
      ...respuestasDeError("NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/google/autorizacion",
    tags: ["Importaciones"],
    summary: "Dirección de Google para conectar una cuenta",
    description:
      "Solo Admin (regla 17). Arma la dirección de autorización de Google (permiso `drive.readonly`, sin acceso sin conexión, eligiendo la cuenta) con el `state` y " +
      "el desafío PKCE que generó el frontend. La dirección a la que Google devuelve a la persona sale de la configuración del servidor, nunca de la petición. " +
      "`409` si Google no está configurado.",
    security: AUTENTICADO,
    request: { query: EsquemaAutorizacionGoogleQuery },
    responses: {
      200: { description: "Dirección de autorización.", content: { "application/json": { schema: EsquemaUrlGoogle } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "CONFLICTO"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/admin/google/conexion",
    tags: ["Importaciones"],
    summary: "Cambiar el código de Google por un token de lectura",
    description:
      "Solo Admin (regla 17). Cambia el código de autorización por un token de acceso de solo lectura que vale una hora, y devuelve también el correo de la cuenta. " +
      "No guarda nada: el token solo vive en la cookie `httpOnly` del frontend y vuelve en la cabecera `X-Google-Access-Token` de las peticiones del importador. " +
      "La respuesta no se guarda en caché. Si Google rechaza el código, `400` con un mensaje genérico (nunca el de Google).",
    security: AUTENTICADO,
    request: { body: { content: { "application/json": { schema: EsquemaConexionGoogleBody } } } },
    responses: {
      200: { description: "Cuenta conectada.", content: { "application/json": { schema: EsquemaConexionGoogle } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "CONFLICTO"),
    },
  });
}
