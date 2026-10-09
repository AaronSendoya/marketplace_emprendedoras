import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { esquemaPaginacion } from "@/api/http/paginacion";
import { esquemaPagina, PUBLICO, respuestasDeError } from "../componentes";

const EJEMPLO_ID = "0b0f1a0e-2c6b-4c7a-9a38-6f8c1f0d3e11";
const referencia = (ejemplo: string) => z.object({ id: z.string(), nombre: z.string().meta({ example: ejemplo }) });

export const EsquemaIdPromocion = z.object({ id: z.uuid().meta({ description: "Id de la promoción (del descuento)." }) });

// Regla 23: la misma semilla da siempre el mismo orden.
const semilla = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "La semilla solo admite letras, números, guion y guion bajo.")
  .meta({ description: "Obligatoria con `orden=aleatorio`: la misma semilla da siempre el mismo orden (regla 23).", example: "k3x9q2" });

export const EsquemaPromocionesQuery = esquemaPaginacion.extend({
  perfil_id: z.uuid().optional(),
  ciudad_id: z.uuid().optional(),
  rubro_id: z.uuid().optional(),
  q: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .meta({
      description:
        "Texto a buscar (regla 23). Se separa en palabras (hasta 6) y cada una debe aparecer en el nombre del negocio o en el texto del descuento. Sin distinguir mayúsculas ni acentos y sin resultados parecidos. Se combina con los demás filtros con AND.",
    }),
  orden: z
    .enum(["recientes", "aleatorio", "mayor_descuento", "termina_pronto"])
    .optional()
    .meta({
      description:
        "`recientes` (por defecto), `aleatorio` (exige `semilla`), `mayor_descuento` o `termina_pronto` (los que no tienen fecha de fin, al final).",
    }),
  semilla: semilla.optional(),
});

export const EsquemaPromocionPublica = z
  .object({
    id: z.string().meta({ example: EJEMPLO_ID }),
    porcentaje: z.number().meta({ example: 10 }),
    descripcion: z.string().nullable().meta({ description: "Detalle del descuento (regla 8); `null` si no tiene.", example: "Descuento por el día del estudiante." }),
    fecha_inicio: z.iso.datetime().nullable().meta({ description: "`null` = rige desde que se creó." }),
    fecha_fin: z.iso.datetime().nullable().meta({ description: "`null` = sin fecha de fin (permanente)." }),
    productos_total: z.number().int().meta({ description: "Cuántos productos activos lo llevan." }),
    productos_muestra: z.array(z.string()).meta({ description: "Hasta 3 imágenes de esos productos (URLs)." }),
    perfil: z.object({
      id: z.string(),
      nombre_negocio: z.string().meta({ example: "Dulces de prueba" }),
      whatsapp: z.string(),
      ciudad: referencia("Cobija"),
      rubro: referencia("Alimentos y bebidas"),
      logo_url: z.string(),
    }),
  })
  .meta({ id: "PromocionPublica" });

const EsquemaPromocionesPagina = esquemaPagina(EsquemaPromocionPublica, "PromocionesPagina");

export function registrarPromociones(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "get",
    path: "/marketplace/promociones",
    tags: ["Marketplace"],
    summary: "Promociones vigentes",
    description:
      "Público (regla 23). Una promoción es un descuento que rige ahora, de una cuenta activa y con al menos un producto activo asignado; " +
      "se muestra aunque esos productos tengan el precio oculto o ausente. Cada una trae el descuento, el negocio, cuántos productos lleva " +
      "y hasta tres imágenes de ellos. Los productos de una promoción se piden con `GET /marketplace/productos?descuento_id=`.",
    security: PUBLICO,
    request: { query: EsquemaPromocionesQuery },
    responses: {
      200: { description: "Página de promociones.", content: { "application/json": { schema: EsquemaPromocionesPagina } } },
      ...respuestasDeError("VALIDACION"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/marketplace/promociones/{id}",
    tags: ["Marketplace"],
    summary: "Detalle de una promoción",
    description: "Público (regla 23). Una promoción que no rige, es de una cuenta desactivada o no tiene productos activos responde 404.",
    security: PUBLICO,
    request: { params: EsquemaIdPromocion },
    responses: {
      200: { description: "Promoción.", content: { "application/json": { schema: EsquemaPromocionPublica } } },
      ...respuestasDeError("VALIDACION", "NO_ENCONTRADO"),
    },
  });
}
