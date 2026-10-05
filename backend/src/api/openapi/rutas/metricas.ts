import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { AUTENTICADO, PUBLICO, respuestasDeError } from "../componentes";
import { EsquemaIdPerfil } from "./perfiles";

export const EsquemaRegistrarClicBody = z
  .object({
    tipo: z.enum(["whatsapp", "instagram"]).meta({ description: "A cuál de los dos contactos del perfil se hizo clic." }),
  })
  .strict();

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fechaOpcional = (etiqueta: string) =>
  z
    .string()
    .regex(SOLO_FECHA, "Debe tener el formato YYYY-MM-DD.")
    .optional()
    .meta({ description: `${etiqueta}, día de La Paz (YYYY-MM-DD). Sin ninguna de las dos, trae los últimos 30 días.`, example: "2026-10-01" });

// Las cuatro lecturas de la regla 19 comparten el mismo rango: sin `desde`/`hasta`, el Admin ve
// los últimos 30 días (resolverRango, dominio). La validación de calendario (fecha inexistente,
// "hasta" antes que "desde", rango mayor a 2 años) vive ahí, no acá: este esquema solo valida el
// formato del texto.
export const EsquemaRangoQuery = z.object({
  desde: fechaOpcional("Desde"),
  hasta: fechaOpcional("Hasta"),
});

// "Top N": no es una página (sin `pagina`, siempre ordenado por total descendente), por eso no
// reutiliza esquemaPaginacion.
export const EsquemaRankingQuery = EsquemaRangoQuery.extend({
  limite: z.coerce.number().int().min(1).max(20).default(10).meta({ description: "Cuántas cuentas trae el ranking (y el mapa de calor)." }),
});

// El mapa de calor elige y ordena su top con los clics totales o con los de un solo canal.
export const EsquemaMapaCalorQuery = EsquemaRankingQuery.extend({
  orden: z.enum(["total", "whatsapp", "instagram"]).default("total").meta({
    description:
      "Con qué se arma y se ordena el top: los clics totales (por defecto) o los de un solo canal. Con `whatsapp`, " +
      "las `limite` cuentas con más clics de WhatsApp; no es un reordenamiento del top por total.",
  }),
});

export const EsquemaResumenClics = z
  .object({
    whatsapp: z.number().int().meta({ example: 128 }),
    instagram: z.number().int().meta({ example: 46 }),
  })
  .meta({ id: "ResumenClics" });

export const EsquemaItemRankingClic = z
  .object({
    perfil_id: z.string(),
    nombre_negocio: z.string().meta({ example: "Dulces de Ana" }),
    whatsapp: z.number().int().meta({ example: 20 }),
    instagram: z.number().int().meta({ example: 8 }),
    total: z.number().int().meta({ example: 28 }),
  })
  .meta({ id: "ItemRankingClic" });

export const EsquemaItemSerieClic = z
  .object({
    fecha: z.string().meta({ description: "YYYY-MM-DD, día de La Paz.", example: "2026-10-01" }),
    whatsapp: z.number().int().meta({ example: 3 }),
    instagram: z.number().int().meta({ example: 1 }),
  })
  .meta({ id: "ItemSerieClic" });

export const EsquemaItemRubroClic = z
  .object({
    rubro: z.string().meta({ example: "Alimentos y bebidas" }),
    total: z.number().int().meta({ example: 15 }),
  })
  .meta({ id: "ItemRubroClic" });

export const EsquemaColumnaMapaCalor = z
  .object({
    inicio: z.string().meta({ description: "Primer día de la columna (YYYY-MM-DD, día de La Paz).", example: "2026-09-28" }),
    fin: z.string().meta({ description: "Último día de la columna (YYYY-MM-DD, día de La Paz). Igual a `inicio` con granularidad `dia`.", example: "2026-10-04" }),
  })
  .meta({ id: "ColumnaMapaCalor" });

export const EsquemaCeldaMapaCalor = z
  .object({
    whatsapp: z.number().int().meta({ example: 3 }),
    instagram: z.number().int().meta({ example: 1 }),
  })
  .meta({ id: "CeldaMapaCalor" });

export const EsquemaFilaMapaCalor = z
  .object({
    perfil_id: z.string(),
    nombre_negocio: z.string().meta({ example: "Dulces de Ana" }),
    whatsapp: z.number().int().meta({ description: "Suma de las celdas de la fila.", example: 20 }),
    instagram: z.number().int().meta({ description: "Suma de las celdas de la fila.", example: 8 }),
    total: z.number().int().meta({ description: "whatsapp + instagram.", example: 28 }),
    total_anterior: z.number().int().meta({
      description:
        "Clics totales de la cuenta en el período inmediatamente anterior de igual duración (el que termina el día " +
        "previo a `desde`); 0 si no tuvo. Sirve para calcular la tendencia.",
      example: 24,
    }),
    celdas: z.array(EsquemaCeldaMapaCalor).meta({ description: "Una celda por columna, en el mismo orden que `columnas`." }),
  })
  .meta({ id: "FilaMapaCalor" });

export const EsquemaMapaCalorClics = z
  .object({
    granularidad: z.enum(["dia", "semana", "mes"]).meta({
      description:
        "Lo que representa cada columna, según los días del período: hasta 45 días, un día; hasta 180, una semana " +
        "(lunes a domingo); más, un mes de calendario.",
    }),
    columnas: z.array(EsquemaColumnaMapaCalor),
    filas: z.array(EsquemaFilaMapaCalor),
  })
  .meta({ id: "MapaCalorClics" });

export function registrarMetricas(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "post",
    path: "/perfiles/{id}/clics",
    tags: ["Métricas"],
    summary: "Registrar un clic de contacto",
    description:
      "Público, sin autenticar (regla 19). Un evento anónimo por clic en el WhatsApp o el Instagram de un perfil: " +
      "solo se guarda el perfil, el tipo y la fecha, nunca un dato del visitante. 404 si el perfil no existe o su " +
      "cuenta está desactivada (regla 18).",
    security: PUBLICO,
    request: { params: EsquemaIdPerfil, body: { content: { "application/json": { schema: EsquemaRegistrarClicBody } } } },
    responses: {
      204: { description: "Clic registrado." },
      ...respuestasDeError("VALIDACION", "NO_ENCONTRADO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/metricas/resumen",
    tags: ["Métricas"],
    summary: "Totales de clics",
    description: "Solo Admin. Suma de clics a WhatsApp y a Instagram, de cuentas activas (regla 18), en el rango indicado.",
    security: AUTENTICADO,
    request: { query: EsquemaRangoQuery },
    responses: {
      200: { description: "Totales.", content: { "application/json": { schema: EsquemaResumenClics } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/metricas/ranking",
    tags: ["Métricas"],
    summary: "Cuentas más contactadas",
    description: "Solo Admin. Top de cuentas activas (regla 18) por clics totales en el rango indicado, descendente.",
    security: AUTENTICADO,
    request: { query: EsquemaRankingQuery },
    responses: {
      200: { description: "Ranking.", content: { "application/json": { schema: z.array(EsquemaItemRankingClic) } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/metricas/serie",
    tags: ["Métricas"],
    summary: "Serie diaria de clics",
    description:
      "Solo Admin. Un punto por día (día de La Paz) dentro del rango indicado, completo: los días sin clics vienen " +
      "en 0. Alimenta el gráfico de interacción y las sparklines del Dashboard.",
    security: AUTENTICADO,
    request: { query: EsquemaRangoQuery },
    responses: {
      200: { description: "Serie.", content: { "application/json": { schema: z.array(EsquemaItemSerieClic) } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/metricas/por-rubro",
    tags: ["Métricas"],
    summary: "Clics por rubro",
    description:
      "Solo Admin. Suma de clics (WhatsApp + Instagram) de cuentas activas (regla 18) en el rango indicado, " +
      "agrupada por rubro, descendente.",
    security: AUTENTICADO,
    request: { query: EsquemaRangoQuery },
    responses: {
      200: { description: "Distribución por rubro.", content: { "application/json": { schema: z.array(EsquemaItemRubroClic) } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/metricas/mapa-calor",
    tags: ["Métricas"],
    summary: "Mapa de calor de clics",
    description:
      "Solo Admin. Las cuentas activas (regla 18) con más clics en el rango indicado, hasta `limite`, según `orden` " +
      "(totales por defecto, o los de WhatsApp o los de Instagram), con sus clics por canal, su evolución en el tiempo " +
      "y los clics del período anterior de igual duración (`total_anterior`). La evolución es una celda por columna: el " +
      "servidor elige la granularidad según los días del rango (hasta 45 días, un día por columna; hasta 180, una " +
      "semana; más, un mes), todo en días de La Paz, con la primera y la última columna recortadas al rango, y trae 0 " +
      "donde no hubo clics. Las filas salen en el orden pedido (en empate, por total y luego por nombre). Solo conteos " +
      "agregados, nunca el evento individual.",
    security: AUTENTICADO,
    request: { query: EsquemaMapaCalorQuery },
    responses: {
      200: { description: "Mapa de calor.", content: { "application/json": { schema: EsquemaMapaCalorClics } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });
}
