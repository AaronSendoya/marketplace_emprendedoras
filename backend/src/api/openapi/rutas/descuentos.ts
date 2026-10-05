import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { esquemaPaginacion } from "@/api/http/paginacion";
import { AUTENTICADO, esquemaPagina, respuestasDeError } from "../componentes";

const MENSAJE_PORCENTAJE = "El porcentaje debe ser mayor que 0 y hasta 100, con hasta 2 decimales.";

const porcentaje = z
  .number()
  .gt(0, MENSAJE_PORCENTAJE)
  .max(100, MENSAJE_PORCENTAJE)
  .refine((valor) => Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6, MENSAJE_PORCENTAJE)
  .meta({ example: 15 });

// La interpretación (día completo, hora de La Paz, zona explícita) es del dominio: VigenciaDescuento.
const fecha = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .meta({
    description:
      "`YYYY-MM-DD` (día completo: inicio 00:00:00, fin 23:59:59, hora de La Paz), `YYYY-MM-DDTHH:mm` (hora de La Paz) " +
      "o ISO 8601 con zona. Se guarda en UTC (regla 8).",
    example: "2026-12-01",
  });

export const EsquemaCrearDescuentoBody = z
  .object({
    perfil_id: z.uuid().optional().meta({ description: "Solo Admin: perfil al que pertenece. Una emprendedora usa el suyo." }),
    porcentaje,
    fecha_inicio: fecha.nullable().optional().meta({ description: "Sin fecha rige desde que se crea." }),
    fecha_fin: fecha.nullable().optional().meta({ description: "Sin fecha es permanente.", example: "2026-12-31" }),
  })
  .strict();

export const EsquemaEditarDescuentoBody = z
  .object({
    porcentaje: porcentaje.optional(),
    fecha_inicio: fecha.nullable().optional().meta({ description: "`null` quita la fecha." }),
    fecha_fin: fecha.nullable().optional().meta({ description: "`null` la quita (permanente). Un descuento no se borra: se termina con la fecha de fin." }),
  })
  .strict()
  .refine((datos) => Object.values(datos).some((valor) => valor !== undefined), "Indica al menos un campo para cambiar.");

export const EsquemaAsignarProductosBody = z
  .object({ producto_ids: z.array(z.uuid()).min(1).max(50).meta({ description: "Productos del mismo perfil que el descuento." }) })
  .strict();

export const EsquemaIdDescuento = z.object({ id: z.uuid().meta({ description: "Id del descuento." }) });
export const EsquemaQuitarProductoParams = z.object({
  id: z.uuid().meta({ description: "Id del descuento." }),
  producto_id: z.uuid().meta({ description: "Id del producto." }),
});
// `estado` filtra la lista (regla 8): solo los descuentos en ese estado, con la paginación y el total ya
// filtrados. Sin él, todos. Lo comparten GET /mis/descuentos y GET /admin/usuarios/{id}/descuentos.
export const EsquemaMisDescuentosQuery = esquemaPaginacion.extend({
  estado: z.enum(["programado", "vigente", "vencido"]).optional().meta({
    description:
      "Solo los descuentos en ese estado: `programado` (aún no empieza), `vigente` o `vencido` (ya caducó). Se calcula al " +
      "consultar, no es una columna. Sin este parámetro, todos.",
  }),
});

export const EsquemaDescuento = z
  .object({
    id: z.string().meta({ example: "0f7d3b6a-5555-4a2b-8c3d-9e0f1a2b3c4d" }),
    perfil_id: z.string(),
    porcentaje: z.number().meta({ example: 15 }),
    fecha_inicio: z.iso.datetime().nullable(),
    fecha_fin: z.iso.datetime().nullable(),
    estado: z.enum(["programado", "vigente", "vencido"]).meta({ description: "Calculado al consultar (regla 8): `programado` aún no empieza; `vencido` ya caducó." }),
    producto_ids: z.array(z.string()).meta({ description: "Productos a los que está asignado." }),
    creado_en: z.iso.datetime(),
  })
  .meta({ id: "Descuento" });

// Exportado (no inline) para que el módulo admin reutilice exactamente este mismo objeto al
// documentar GET /admin/usuarios/{id}/descuentos: zod-to-openapi identifica cada esquema
// registrado por su referencia, así que repetir `esquemaPagina(..., "DescuentosPagina")` con un
// objeto distinto pero el mismo id rompería la generación del documento.
export const EsquemaDescuentosPagina = esquemaPagina(EsquemaDescuento, "DescuentosPagina");

export function registrarDescuentos(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/mis/descuentos",
    tags: ["Descuentos"],
    summary: "Mis descuentos",
    description: "Los descuentos del perfil de la cuenta autenticada, con su estado (`programado`, `vigente` o `vencido`) y sus productos.",
    security: AUTENTICADO,
    request: { query: EsquemaMisDescuentosQuery },
    responses: {
      200: { description: "Página de descuentos.", content: { "application/json": { schema: EsquemaDescuentosPagina } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/descuentos",
    tags: ["Descuentos"],
    summary: "Crear un descuento",
    description:
      "Siempre por porcentaje. Las fechas son opcionales e independientes; si hay ambas, la de fin debe ser posterior. " +
      "Un descuento con inicio futuro se activa solo al llegar esa fecha (regla 8). Se asigna a productos con " +
      "`POST /descuentos/{id}/productos`.",
    security: AUTENTICADO,
    request: { body: { content: { "application/json": { schema: EsquemaCrearDescuentoBody } } } },
    responses: {
      201: { description: "Descuento creado.", content: { "application/json": { schema: EsquemaDescuento } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO", "CONFLICTO"),
    },
  });

  registro.registerPath({
    method: "patch",
    path: "/descuentos/{id}",
    tags: ["Descuentos"],
    summary: "Editar un descuento",
    description:
      "Solo su dueña o un Admin. Cambia el porcentaje o las fechas. No hay `DELETE`: un descuento se termina " +
      "editando `fecha_fin`. El rango se valida con lo que quedaría guardado.",
    security: AUTENTICADO,
    request: { params: EsquemaIdDescuento, body: { content: { "application/json": { schema: EsquemaEditarDescuentoBody } } } },
    responses: {
      200: { description: "Descuento actualizado.", content: { "application/json": { schema: EsquemaDescuento } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/descuentos/{id}/productos",
    tags: ["Descuentos"],
    summary: "Asignar un descuento a productos",
    description:
      "Los productos deben ser del mismo perfil que el descuento (regla 9): si alguno es de otro perfil, 403 y no se " +
      "asigna ninguno. Es idempotente. Si un producto tiene varios descuentos vigentes, se aplica el de mayor porcentaje.",
    security: AUTENTICADO,
    request: { params: EsquemaIdDescuento, body: { content: { "application/json": { schema: EsquemaAsignarProductosBody } } } },
    responses: {
      200: { description: "Descuento con sus productos.", content: { "application/json": { schema: EsquemaDescuento } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "delete",
    path: "/descuentos/{id}/productos/{producto_id}",
    tags: ["Descuentos"],
    summary: "Quitar un descuento de un producto",
    description: "Quita solo la asignación; el descuento no se borra. Es idempotente.",
    security: AUTENTICADO,
    request: { params: EsquemaQuitarProductoParams },
    responses: {
      204: { description: "Asignación quitada." },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "NO_ENCONTRADO"),
    },
  });
}
