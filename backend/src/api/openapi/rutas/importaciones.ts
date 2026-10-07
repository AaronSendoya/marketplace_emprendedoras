import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { MAXIMO_DE_FILAS_POR_IMPORTACION } from "@/core/importaciones/application/AnalizarExcelEmprendedoras";
import { MAXIMO_DE_FILAS_POR_TANDA } from "@/core/importaciones/application/ImportarEmprendedoras";
import { AUTENTICADO, respuestasDeError } from "../componentes";

// Regla 22. Los límites de aquí solo frenan abusos (un cuerpo enorme); los mensajes situacionales de cada dato los pone el dominio
// al validar, por eso un texto largo o vacío no es un 400 del esquema sino un aviso de la fila.
const texto = (maximo: number) => z.string().max(maximo);

export const EsquemaDatosFila = z
  .object({
    correo: texto(300),
    nombres: texto(300),
    apellido_paterno: texto(300),
    apellido_materno: texto(300).meta({ description: "Vacío si la persona no tiene apellido materno (regla 10)." }),
    whatsapp: texto(60),
    ciudad_id: texto(64),
    ciudad_texto: texto(200).default("").meta({ description: "Lo que decía el Excel; solo sirve para armar los mensajes, no se guarda." }),
    rubro_id: texto(64),
    rubro_texto: texto(200).default(""),
    nombre_negocio: texto(300),
    descripcion: texto(4000),
    instagram: texto(300).meta({ description: "Usuario sin arroba; vacío si no tiene." }),
    otra_red_social: texto(300),
  })
  .strict();

const EsquemaFilaAImportar = z
  .object({
    fila: z.number().int().min(1).max(1_048_576).meta({ description: "Número de fila en el Excel, para relacionar la respuesta con la vista previa." }),
    datos: EsquemaDatosFila,
  })
  .strict();

export const EsquemaFilasBody = z
  .object({ filas: z.array(EsquemaFilaAImportar).min(1).max(MAXIMO_DE_FILAS_POR_TANDA) })
  .strict();

const EsquemaAviso = z
  .object({
    campo: z.string().meta({ example: "whatsapp" }),
    codigo: z.string().meta({ example: "whatsapp_invalido" }),
    severidad: z.enum(["error", "revisar", "info"]).meta({ description: "`error` impide importar la fila; `revisar` es una suposición que conviene mirar; `info` solo informa." }),
    mensaje: z.string().meta({ example: "El WhatsApp «hola» no es válido. En Bolivia son 8 dígitos y empiezan con 6 o 7; con otro país, escribe el código con +." }),
    reporte: z.boolean().meta({ description: "También va al reporte «por revisar» que se descarga al terminar." }),
  })
  .meta({ id: "AvisoImportacion" });

const ESTADOS_DE_FILA = ["lista", "revisar", "error", "ya_existe", "repetida"] as const;

// En la respuesta, `ciudad_texto` y `rubro_texto` siempre vienen.
const EsquemaDatosFilaRespuesta = z
  .object({
    correo: z.string(),
    nombres: z.string(),
    apellido_paterno: z.string(),
    apellido_materno: z.string(),
    whatsapp: z.string().meta({ description: "Ya normalizado y con `+` (por ejemplo `+59171234567`) cuando es válido." }),
    ciudad_id: z.string(),
    ciudad_texto: z.string(),
    rubro_id: z.string(),
    rubro_texto: z.string(),
    nombre_negocio: z.string(),
    descripcion: z.string(),
    instagram: z.string(),
    otra_red_social: z.string(),
  })
  .meta({ id: "DatosFilaImportacion" });

const EsquemaFilaAnalizada = z
  .object({
    fila: z.number().int().meta({ description: "Número de fila en el Excel." }),
    oculta: z.boolean().meta({ description: "La fila estaba oculta por un filtro de Excel." }),
    estado: z.enum(ESTADOS_DE_FILA).meta({ description: "`repetida` y `ya_existe` nunca se importan." }),
    datos: EsquemaDatosFilaRespuesta,
    avisos: z.array(EsquemaAviso),
    ya_existe: z.boolean(),
    repetida_de: z.number().int().nullable().meta({ description: "Fila donde aparece primero el mismo correo." }),
    textos: z.object({ instagram: z.string() }).meta({ description: "Lo que decía el Excel, para el reporte «por revisar»." }),
  })
  .meta({ id: "FilaAnalizadaImportacion" });

const EsquemaAnalisis = z
  .object({
    hoja: z.string().meta({ description: "La hoja que se leyó." }),
    hojas: z.array(z.string()),
    columnas: z.object({
      reconocidas: z.array(z.string()),
      ignoradas: z.array(z.string()).meta({ description: "Encabezados que se ignoran a propósito (fotos, logo, marca temporal y el beneficio, que no se registra)." }),
      opcionales_ausentes: z.array(z.string()),
    }),
    filas: z.array(EsquemaFilaAnalizada),
    resumen: z.object({
      total: z.number().int(),
      listas: z.number().int(),
      revisar: z.number().int(),
      con_error: z.number().int(),
      ya_existen: z.number().int(),
      repetidas: z.number().int(),
      ocultas: z.number().int(),
    }),
  })
  .meta({ id: "AnalisisImportacion" });

const EsquemaValidacion = z
  .object({
    filas: z.array(
      z.object({ fila: z.number().int(), estado: z.enum(ESTADOS_DE_FILA), avisos: z.array(EsquemaAviso), ya_existe: z.boolean() }),
    ),
  })
  .meta({ id: "ValidacionImportacion" });

const EsquemaResultadoDeImportacion = z
  .object({
    resultados: z.array(
      z.object({
        fila: z.number().int(),
        correo: z.string(),
        estado: z.enum(["creada", "omitida", "error"]),
        cuenta_creada: z.boolean(),
        perfil_creado: z.boolean(),
        password_temporal: z.string().nullable().meta({ description: "Solo si se creó la cuenta, y solo en esta respuesta: no se guarda en claro ni se vuelve a mostrar (regla 5)." }),
        avisos: z.array(EsquemaAviso),
        mensaje: z.string().nullable(),
      }),
    ),
  })
  .meta({ id: "ResultadoImportacion" });

const EsquemaArchivoMultipart = z.object({
  archivo: z.string().meta({ type: "string", format: "binary", description: "Un archivo Excel `.xlsx` (sin macros) de hasta 2 MB." }),
});

export function registrarImportaciones(registro: OpenAPIRegistry): void {
  registro.registerPath({
    method: "post",
    path: "/admin/importaciones/emprendedoras/analizar",
    tags: ["Importaciones"],
    summary: "Analizar el Excel de emprendedoras (no escribe nada)",
    description:
      "Solo Admin (regla 22). `multipart/form-data` con el campo `archivo`: un `.xlsx` sin macros de hasta 2 MB, " +
      `${MAXIMO_DE_FILAS_POR_IMPORTACION} filas y 20 MB descomprimidos. Devuelve cada fila normalizada, con su estado y sus avisos, para la vista ` +
      "previa. Los encabezados se reconocen por su texto, en la fila 1, sin importar el orden. Las columnas de fotos, logo y beneficio se ignoran. " +
      "No crea nada. El archivo no se guarda.",
    security: AUTENTICADO,
    request: { body: { content: { "multipart/form-data": { schema: EsquemaArchivoMultipart } } } },
    responses: {
      200: { description: "Filas leídas del Excel.", content: { "application/json": { schema: EsquemaAnalisis } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "ARCHIVO_MUY_GRANDE"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/admin/importaciones/emprendedoras/validar",
    tags: ["Importaciones"],
    summary: "Revisar filas corregidas (no escribe nada)",
    description:
      `Solo Admin (regla 22). Hasta ${MAXIMO_DE_FILAS_POR_TANDA} filas. Vuelve a aplicar las reglas a datos que el Admin corrigió en la vista previa y dice ` +
      "si el correo ya tiene cuenta. Solo ve errores: las suposiciones («para revisar») salen del análisis del archivo.",
    security: AUTENTICADO,
    request: { body: { content: { "application/json": { schema: EsquemaFilasBody } } } },
    responses: {
      200: { description: "Estado de cada fila.", content: { "application/json": { schema: EsquemaValidacion } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/admin/importaciones/emprendedoras",
    tags: ["Importaciones"],
    summary: "Importar emprendedoras",
    description:
      `Solo Admin (regla 22). Hasta ${MAXIMO_DE_FILAS_POR_TANDA} filas por petición. Por cada fila crea la cuenta (rol Emprendedor, correo sin verificar, ` +
      "contraseña temporal aleatoria), el perfil con las imágenes predeterminadas (regla 11); no crea descuentos. " +
      "Vuelve a validar todo: la vista previa no se da por buena. Una cuenta cuyo correo ya existe se omite. Una fila que falla no " +
      "detiene a las demás. La contraseña temporal solo sale en esta respuesta.",
    security: AUTENTICADO,
    request: { body: { content: { "application/json": { schema: EsquemaFilasBody } } } },
    responses: {
      200: { description: "Resultado de cada fila.", content: { "application/json": { schema: EsquemaResultadoDeImportacion } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/importaciones/emprendedoras/plantilla",
    tags: ["Importaciones"],
    summary: "Descargar la plantilla de ejemplo",
    description:
      "Solo Admin (regla 22). Un `.xlsx` con los encabezados del formulario de Google Forms y dos filas inventadas que muestran el formato esperado.",
    security: AUTENTICADO,
    responses: {
      200: {
        description: "Archivo Excel de ejemplo.",
        content: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { schema: z.string().meta({ type: "string", format: "binary" }) } },
      },
      ...respuestasDeError("NO_AUTENTICADO", "PROHIBIDO"),
    },
  });
}
