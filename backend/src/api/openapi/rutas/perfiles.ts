import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { esquemaPaginacion } from "@/api/http/paginacion";
import { AUTENTICADO, esquemaPagina, PUBLICO, respuestasDeError } from "../componentes";

const texto = (maximo: number) => z.string().trim().min(1).max(maximo);
const instagram = z
  .string()
  .trim()
  .max(200)
  .meta({ description: "`@usuario`, `instagram.com/usuario` o `usuario`; se guarda solo el usuario (regla 3).", example: "@mitienda" });
const otraRedSocial = z
  .string()
  .trim()
  .max(50)
  .meta({ description: "Tercera red social (opcional), texto libre de hasta 50 caracteres; se guarda tal cual, recortado (regla 3).", example: "@mitienda_tiktok" });
const whatsapp = texto(40).meta({
  description: "Con o sin `+591`, espacios o guiones; se guarda solo dígitos con el código de país (regla 2).",
  example: "+591 71234567",
});
// En un formulario multipart todo llega como texto.
const booleanoTexto = z.enum(["true", "false"]).transform((valor) => valor === "true");

const LIMITE_TEXTO = { nombre: 150, descripcion: 2000 };

// Validan los campos de texto de los formularios multipart (los archivos se leen aparte).
export const EsquemaCrearPerfilForm = z
  .object({
    usuario_id: z.uuid().optional(),
    nombre_negocio: texto(LIMITE_TEXTO.nombre),
    descripcion: texto(LIMITE_TEXTO.descripcion),
    whatsapp,
    instagram: instagram.optional(),
    otra_red_social: otraRedSocial.optional(),
    ciudad_id: z.uuid(),
    rubro_id: z.uuid(),
    usar_foto_predeterminada: booleanoTexto.optional(),
    usar_logo_predeterminado: booleanoTexto.optional(),
  })
  .strict();

export const EsquemaImagenForm = z.object({ usar_predeterminada: booleanoTexto.optional() }).strict();

export const EsquemaEditarPerfilBody = z
  .object({
    nombre_negocio: texto(LIMITE_TEXTO.nombre).optional(),
    descripcion: texto(LIMITE_TEXTO.descripcion).optional(),
    whatsapp: whatsapp.optional(),
    instagram: instagram.nullable().optional().meta({ description: "`null` o texto vacío quita el Instagram." }),
    otra_red_social: otraRedSocial.nullable().optional().meta({ description: "`null` o texto vacío quita la otra red social." }),
    ciudad_id: z.uuid().optional(),
    rubro_id: z.uuid().optional(),
  })
  .strict()
  .refine((datos) => Object.values(datos).some((valor) => valor !== undefined), "Indica al menos un campo para cambiar.");

export const EsquemaIdPerfil = z.object({ id: z.uuid().meta({ description: "Id del perfil." }) });

export const EsquemaListarPerfilesQuery = esquemaPaginacion.extend({
  ciudad_id: z.uuid().optional(),
  rubro_id: z.uuid().optional(),
  q: z.string().trim().min(1).max(100).optional().meta({ description: "Texto a buscar en el nombre del negocio y la descripción." }),
});

const referencia = (ejemplo: string) => z.object({ id: z.string(), nombre: z.string().meta({ example: ejemplo }) });

export const EsquemaPerfil = z
  .object({
    id: z.string().meta({ example: "0f7d3b6a-3333-4a2b-8c3d-9e0f1a2b3c4d" }),
    nombre_negocio: z.string().meta({ example: "Dulces de Ana" }),
    descripcion: z.string(),
    whatsapp: z.string().meta({ description: "Solo dígitos, con código de país.", example: "59171234567" }),
    instagram_username: z.string().nullable().meta({ example: "dulcesdeana" }),
    otra_red_social: z.string().nullable().meta({ description: "Tercera red social opcional; `null` si no la tiene.", example: "@dulcesdeana_tiktok" }),
    ciudad: referencia("La Paz"),
    rubro: referencia("Alimentos y bebidas"),
    emprendedora: z.string().meta({ description: "Nombre completo de la emprendedora (regla 10). El correo nunca se expone.", example: "Ana Pérez Rojas" }),
    foto_perfil_url: z.string().meta({ example: "https://cdn.midominio.com/perfiles/3f2a.webp" }),
    logo_url: z.string().meta({ example: "https://cdn.midominio.com/logos/9b1c.webp" }),
    creado_en: z.iso.datetime(),
    actualizado_en: z.iso.datetime(),
  })
  .meta({ id: "Perfil" });

// Solo documentación: describe las partes del formulario, incluidos los archivos.
const archivo = (descripcion: string) => z.string().meta({ type: "string", format: "binary", description: descripcion });

const EsquemaCrearPerfilMultipart = z.object({
  usuario_id: z.string().optional().meta({ description: "Solo Admin: cuenta Emprendedor a la que pertenece el perfil. Una emprendedora crea el suyo." }),
  nombre_negocio: z.string().meta({ example: "Dulces de Ana" }),
  descripcion: z.string(),
  whatsapp: z.string().meta({ example: "+591 71234567" }),
  instagram: z.string().optional().meta({ example: "@mitienda" }),
  otra_red_social: z.string().optional().meta({ description: "Opcional, hasta 50 caracteres.", example: "@mitienda_tiktok" }),
  ciudad_id: z.string(),
  rubro_id: z.string(),
  foto_perfil: archivo("JPEG, PNG o WebP de hasta 5 MB. Obligatorio salvo `usar_foto_predeterminada=true`.").optional(),
  usar_foto_predeterminada: z.boolean().optional().meta({ description: "Excepción explícita: usa la foto anónima predeterminada (regla 11)." }),
  logo: archivo("JPEG, PNG o WebP de hasta 5 MB. Obligatorio salvo `usar_logo_predeterminado=true`.").optional(),
  usar_logo_predeterminado: z.boolean().optional().meta({ description: "Excepción explícita: usa el logo vacío predeterminado (regla 11)." }),
});

const EsquemaImagenMultipart = z.object({
  archivo: archivo("JPEG, PNG o WebP de hasta 5 MB.").optional(),
  usar_predeterminada: z.boolean().optional().meta({ description: "Excepción explícita: usa la imagen predeterminada (regla 11)." }),
});

export function registrarPerfiles(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/perfiles",
    tags: ["Perfiles"],
    summary: "Feed de perfiles",
    description:
      "Público. Solo perfiles de cuentas activas (regla 18), más recientes primero. Filtra por ciudad, rubro y texto.",
    security: PUBLICO,
    request: { query: EsquemaListarPerfilesQuery },
    responses: {
      200: { description: "Página de perfiles.", content: { "application/json": { schema: esquemaPagina(EsquemaPerfil, "PerfilesPagina") } } },
      ...respuestasDeError("VALIDACION"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/perfiles/{id}",
    tags: ["Perfiles"],
    summary: "Detalle de un perfil",
    description: "Público. Un perfil de una cuenta desactivada responde 404.",
    security: PUBLICO,
    request: { params: EsquemaIdPerfil },
    responses: {
      200: { description: "Perfil.", content: { "application/json": { schema: EsquemaPerfil } } },
      ...respuestasDeError("VALIDACION", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/mis/perfil",
    tags: ["Perfiles"],
    summary: "Mi perfil",
    description: "El perfil de la cuenta autenticada. 404 si todavía no tiene uno (también para un Admin, que no tiene perfil).",
    security: AUTENTICADO,
    responses: {
      200: { description: "Perfil propio.", content: { "application/json": { schema: EsquemaPerfil } } },
      ...respuestasDeError("NO_AUTENTICADO", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/perfiles",
    tags: ["Perfiles"],
    summary: "Crear un perfil",
    description:
      "`multipart/form-data`. La emprendedora crea el suyo; un Admin lo crea en nombre de una cuenta Emprendedor " +
      "(`usuario_id`). Un usuario tiene un solo perfil (409 si ya existe). Cada imagen se envía como archivo o con la " +
      "marca `usar_*_predeterminad*=true`; nunca se aplica una predeterminada por omisión (regla 11). Las imágenes " +
      "se convierten a WebP, se redimensionan y pierden sus metadatos (regla 16).",
    security: AUTENTICADO,
    request: { body: { content: { "multipart/form-data": { schema: EsquemaCrearPerfilMultipart } } } },
    responses: {
      201: { description: "Perfil creado.", content: { "application/json": { schema: EsquemaPerfil } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO", "CONFLICTO", "ARCHIVO_MUY_GRANDE"),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/perfiles/{id}",
    tags: ["Perfiles"],
    summary: "Editar los datos de un perfil",
    description: "Solo su dueña o un Admin. Cambia solo los campos enviados; las imágenes tienen sus propias rutas.",
    security: AUTENTICADO,
    request: { params: EsquemaIdPerfil, body: { content: { "application/json": { schema: EsquemaEditarPerfilBody } } } },
    responses: {
      200: { description: "Perfil actualizado.", content: { "application/json": { schema: EsquemaPerfil } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO"),
    },
  });

  for (const [ruta, resumen] of [
    ["foto-perfil", "Reemplazar la foto de perfil"],
    ["logo", "Reemplazar el logo"],
  ] as const) {
    registro.registerPath({
      method: "put",
      path: `/perfiles/{id}/${ruta}`,
      tags: ["Perfiles"],
      summary: resumen,
      description:
        "`multipart/form-data` con `archivo`, o `usar_predeterminada=true`. Solo su dueña o un Admin. La imagen " +
        "anterior se borra del almacenamiento (salvo las predeterminadas).",
      security: AUTENTICADO,
      request: { params: EsquemaIdPerfil, body: { content: { "multipart/form-data": { schema: EsquemaImagenMultipart } } } },
      responses: {
        200: { description: "Perfil actualizado.", content: { "application/json": { schema: EsquemaPerfil } } },
        ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO", "ARCHIVO_MUY_GRANDE"),
      },
    });
  }
}
