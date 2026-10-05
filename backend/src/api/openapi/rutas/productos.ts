import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { esquemaPaginacion } from "@/api/http/paginacion";
import { esPrecioValido, PRECIO_MAXIMO } from "@/core/productos/domain/Producto";
import { AUTENTICADO, esquemaPagina, PUBLICO, respuestasDeError } from "../componentes";

const booleanoTexto = z.enum(["true", "false"]).transform((valor) => valor === "true");
const MENSAJE_PRECIO = "El precio debe ser 0 o más, con hasta 2 decimales.";
const LIMITE = { nombre: 150, descripcion: 2000 };

// Unicode: acepta nombres con tildes/ñ sin falsos negativos. Exige al menos 3 caracteres y una
// letra para frenar texto sin sentido ("12345", "!!!"), sin intentar juzgar si el nombre "tiene
// sentido" (eso necesitaría un diccionario/IA y rechazaría marcas legítimas poco comunes).
const CONTIENE_LETRA = /\p{L}/u;
const nombreProducto = z
  .string()
  .trim()
  .min(3, "El nombre debe tener al menos 3 caracteres.")
  .max(LIMITE.nombre, `El nombre no puede superar los ${LIMITE.nombre} caracteres.`)
  .regex(CONTIENE_LETRA, "El nombre debe incluir al menos una letra.");

// Formulario multipart: el precio llega como texto, con punto decimal y hasta 2 decimales.
const precioTexto = z
  .string()
  .max(11, MENSAJE_PRECIO)
  .regex(/^\d{1,8}(\.\d{1,2})?$/, MENSAJE_PRECIO)
  .transform(Number)
  .meta({ description: "Con punto decimal y hasta 2 decimales. Vacío o ausente = sin precio.", example: "25.50" });

const precioNumero = z.number().min(0, MENSAJE_PRECIO).max(PRECIO_MAXIMO, MENSAJE_PRECIO).refine(esPrecioValido, MENSAJE_PRECIO);

// Validan los campos de texto del formulario de alta (el archivo se lee aparte).
export const EsquemaCrearProductoForm = z
  .object({
    perfil_id: z.uuid().optional(),
    nombre: nombreProducto,
    descripcion: z.string().trim().max(LIMITE.descripcion).optional(),
    precio: precioTexto.optional(),
    mostrar_precio: booleanoTexto.optional(),
  })
  .strict();

export const EsquemaEditarProductoBody = z
  .object({
    nombre: nombreProducto.optional(),
    descripcion: z.string().trim().max(LIMITE.descripcion).nullable().optional().meta({ description: "`null` o texto vacío quita la descripción." }),
    precio: precioNumero.nullable().optional().meta({ description: "`null` quita el precio: el producto muestra \"Consultar Precio\".", example: 25.5 }),
    mostrar_precio: z.boolean().optional(),
    activo: z.boolean().optional().meta({ description: "`false` desactiva el producto; `true` lo reactiva." }),
  })
  .strict()
  .refine((datos) => Object.values(datos).some((valor) => valor !== undefined), "Indica al menos un campo para cambiar.");

export const EsquemaIdProducto = z.object({ id: z.uuid().meta({ description: "Id del producto." }) });

const filtrosFeed = {
  perfil_id: z.uuid().optional(),
  ciudad_id: z.uuid().optional(),
  rubro_id: z.uuid().optional(),
  q: z.string().trim().min(1).max(100).optional().meta({ description: "Texto a buscar en el nombre y la descripción." }),
};
export const EsquemaMarketplaceQuery = esquemaPaginacion.extend(filtrosFeed);
export const EsquemaMisProductosQuery = esquemaPaginacion;

const referencia = (ejemplo: string) => z.object({ id: z.string(), nombre: z.string().meta({ example: ejemplo }) });

const EJEMPLO_ID = "0f7d3b6a-4444-4a2b-8c3d-9e0f1a2b3c4d";

export const EsquemaProductoPublico = z
  .object({
    id: z.string().meta({ example: EJEMPLO_ID }),
    nombre: z.string().meta({ example: "Torta de chocolate" }),
    descripcion: z.string().nullable(),
    imagen_url: z.string().meta({ example: "https://cdn.midominio.com/productos/7d2e.webp" }),
    precio: z.number().nullable().meta({ description: "Nulo si no hay precio o está oculto (regla 7).", example: 120 }),
    porcentaje: z.number().nullable().meta({ description: "Mayor descuento vigente ahora; nulo si no hay o el precio no se muestra (regla 8).", example: 15 }),
    precio_con_descuento: z.number().nullable().meta({ description: "Calculado por el backend; el frontend no calcula precios.", example: 102 }),
    consultar_precio: z.boolean().meta({ description: "`true` cuando no hay precio visible: mostrar el botón \"Consultar Precio\" hacia el WhatsApp del negocio." }),
    creado_en: z.iso.datetime(),
    perfil: z.object({
      id: z.string(),
      nombre_negocio: z.string().meta({ example: "Dulces de Ana" }),
      whatsapp: z.string().meta({ example: "59171234567" }),
      ciudad: referencia("La Paz"),
      rubro: referencia("Alimentos y bebidas"),
      logo_url: z.string(),
    }),
  })
  .meta({ id: "ProductoPublico" });

export const EsquemaProductoPropio = z
  .object({
    id: z.string().meta({ example: EJEMPLO_ID }),
    perfil_id: z.string(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    imagen_url: z.string(),
    precio: z.number().nullable().meta({ description: "El precio real, aunque esté oculto." }),
    mostrar_precio: z.boolean(),
    activo: z.boolean(),
    porcentaje: z.number().nullable().meta({ description: "Mayor descuento vigente ahora." }),
    precio_con_descuento: z.number().nullable(),
    creado_en: z.iso.datetime(),
    actualizado_en: z.iso.datetime(),
  })
  .meta({ id: "ProductoPropio" });

// Exportado (no inline) para que el módulo admin reutilice exactamente este mismo objeto al
// documentar GET /admin/usuarios/{id}/productos: zod-to-openapi identifica cada esquema
// registrado por su referencia, así que repetir `esquemaPagina(..., "MisProductosPagina")` con un
// objeto distinto pero el mismo id rompería la generación del documento.
export const EsquemaMisProductosPagina = esquemaPagina(EsquemaProductoPropio, "MisProductosPagina");

// Solo documentación: describe las partes del formulario, incluido el archivo.
const EsquemaCrearProductoMultipart = z.object({
  perfil_id: z.string().optional().meta({ description: "Solo Admin: perfil al que pertenece el producto. Una emprendedora usa el suyo." }),
  nombre: z.string().meta({ description: "3 a 150 caracteres, con al menos una letra.", example: "Torta de chocolate" }),
  descripcion: z.string().optional(),
  precio: z.string().optional().meta({ example: "120.00" }),
  mostrar_precio: z.boolean().optional().meta({ description: "Por defecto `true`." }),
  imagen: z.string().meta({ type: "string", format: "binary", description: "JPEG, PNG o WebP de hasta 5 MB. Obligatoria." }),
});

const EsquemaImagenProductoMultipart = z.object({
  archivo: z.string().meta({ type: "string", format: "binary", description: "JPEG, PNG o WebP de hasta 5 MB." }),
});

export function registrarProductos(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/marketplace/productos",
    tags: ["Marketplace"],
    summary: "Feed de productos",
    description:
      "Público. Solo productos activos de cuentas activas (regla 18), más recientes primero. Cada producto trae el " +
      "mayor descuento vigente y su precio con descuento, calculados al consultar (regla 8). Con el precio oculto o " +
      "ausente, `precio`, `porcentaje` y `precio_con_descuento` son nulos y `consultar_precio` es `true`.",
    security: PUBLICO,
    request: { query: EsquemaMarketplaceQuery },
    responses: {
      200: { description: "Página de productos.", content: { "application/json": { schema: esquemaPagina(EsquemaProductoPublico, "ProductosPagina") } } },
      ...respuestasDeError("VALIDACION"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/marketplace/productos/{id}",
    tags: ["Marketplace"],
    summary: "Detalle de un producto",
    description: "Público. Un producto inactivo o de una cuenta desactivada responde 404.",
    security: PUBLICO,
    request: { params: EsquemaIdProducto },
    responses: {
      200: { description: "Producto.", content: { "application/json": { schema: EsquemaProductoPublico } } },
      ...respuestasDeError("VALIDACION", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/mis/productos",
    tags: ["Productos"],
    summary: "Mis productos",
    description: "Los productos del perfil de la cuenta autenticada, activos o no, con el precio real. Sin perfil, la lista está vacía.",
    security: AUTENTICADO,
    request: { query: EsquemaMisProductosQuery },
    responses: {
      200: { description: "Página de productos propios.", content: { "application/json": { schema: EsquemaMisProductosPagina } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/productos",
    tags: ["Productos"],
    summary: "Crear un producto",
    description:
      "`multipart/form-data`. La emprendedora lo crea en su perfil (409 si aún no tiene uno); un Admin indica el " +
      "`perfil_id`. La imagen es obligatoria y se convierte a WebP (regla 16). El precio es opcional.",
    security: AUTENTICADO,
    request: { body: { content: { "multipart/form-data": { schema: EsquemaCrearProductoMultipart } } } },
    responses: {
      201: { description: "Producto creado.", content: { "application/json": { schema: EsquemaProductoPropio } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO", "CONFLICTO", "ARCHIVO_MUY_GRANDE"),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/productos/{id}",
    tags: ["Productos"],
    summary: "Editar un producto",
    description: "Solo su dueña o un Admin. Cambia solo los campos enviados. `activo: true` reactiva un producto desactivado.",
    security: AUTENTICADO,
    request: { params: EsquemaIdProducto, body: { content: { "application/json": { schema: EsquemaEditarProductoBody } } } },
    responses: {
      200: { description: "Producto actualizado.", content: { "application/json": { schema: EsquemaProductoPropio } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "put",
    path: "/productos/{id}/imagen",
    tags: ["Productos"],
    summary: "Reemplazar la imagen de un producto",
    description: "`multipart/form-data` con `archivo`. Solo su dueña o un Admin. La imagen anterior se borra del almacenamiento.",
    security: AUTENTICADO,
    request: { params: EsquemaIdProducto, body: { content: { "multipart/form-data": { schema: EsquemaImagenProductoMultipart } } } },
    responses: {
      200: { description: "Producto actualizado.", content: { "application/json": { schema: EsquemaProductoPropio } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO", "ARCHIVO_MUY_GRANDE"),
    },
  });

  registro.registerPath({
    method: "delete",
    path: "/productos/{id}",
    tags: ["Productos"],
    summary: "Desactivar un producto",
    description: "Soft delete: el producto deja de mostrarse (`activo = false`) pero no se borra. Es idempotente. Se reactiva con `PATCH`.",
    security: AUTENTICADO,
    request: { params: EsquemaIdProducto },
    responses: {
      204: { description: "Producto desactivado." },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO"),
    },
  });
}
