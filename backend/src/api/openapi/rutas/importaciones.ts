import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { MAXIMO_DE_FILAS_POR_IMPORTACION } from "@/core/importaciones/application/AnalizarExcelEmprendedoras";
import { MAXIMO_DE_FILAS_POR_TANDA, MAXIMO_DE_FILAS_POR_TANDA_CON_IMAGENES } from "@/core/importaciones/application/ImportarEmprendedoras";
import { MAXIMO_DE_FILAS_A_VERIFICAR } from "@/core/importaciones/application/VerificarImagenesDrive";
import { AUTENTICADO, respuestasDeError } from "../componentes";

// Regla 22. Los límites de aquí solo frenan abusos (un cuerpo enorme); los mensajes situacionales de cada dato los pone el dominio
// al validar, por eso un texto largo o vacío no es un 400 del esquema sino un aviso de la fila.
const texto = (maximo: number) => z.string().max(maximo);

// Id de un archivo de Drive (regla 22, «Imágenes desde Drive»): solo letras, números, guion y guion bajo. Vacío = sin imagen. Nunca una
// dirección: el servidor arma la suya y solo habla con los servidores de Google (regla 17).
const idDeDrive = (descripcion: string) =>
  z
    .string()
    .max(128)
    .regex(/^[A-Za-z0-9_-]*$/, "Debe ser el id de un archivo de Drive (letras, números, guion y guion bajo).")
    .default("")
    .meta({ description: descripcion });

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
    foto_drive_id: idDeDrive("Id del archivo de Drive de la foto de perfil, sacado del enlace del Excel. Vacío si la fila no trae foto."),
    logo_drive_id: idDeDrive("Id del archivo de Drive del logo. Vacío si la fila no trae logo."),
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
    foto_drive_id: z.string(),
    logo_drive_id: z.string(),
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
    textos: z
      .object({ instagram: z.string(), otra_red: z.string() })
      .meta({ description: "Lo que decían las columnas de Instagram y de otra red social, para el reporte «por revisar»." }),
  })
  .meta({ id: "FilaAnalizadaImportacion" });

const EsquemaAnalisis = z
  .object({
    hoja: z.string().meta({ description: "La hoja que se leyó." }),
    hojas: z.array(z.string()),
    columnas: z.object({
      reconocidas: z.array(z.string()),
      ignoradas: z.array(z.string()).meta({ description: "Encabezados que se ignoran a propósito (marca temporal y el beneficio, que no se registra)." }),
      opcionales_ausentes: z.array(z.string()),
      obligatorias_ausentes: z.array(z.string()).meta({
        description: "Columnas obligatorias que el archivo no trae. El archivo se acepta igual: cada fila queda con el error de ese dato y se completa en la vista previa.",
      }),
      desconocidas: z.array(z.string()).meta({ description: "Encabezados que no se parecen a ninguna columna esperada. No se usan." }),
      aproximadas: z
        .array(z.object({ encabezado: z.string(), columna: z.string() }))
        .meta({ description: "Encabezados que se leyeron como una columna esperada por parecerse a ella (una errata)." }),
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
        foto_cargada: z.boolean().meta({ description: "La foto salió de Drive; si no, el perfil tiene la imagen predeterminada (regla 11)." }),
        logo_cargado: z.boolean().meta({ description: "El logo salió de Drive; si no, el perfil tiene la imagen predeterminada (regla 11)." }),
        password_temporal: z.string().nullable().meta({ description: "Solo si se creó la cuenta, y solo en esta respuesta: no se guarda en claro ni se vuelve a mostrar (regla 5)." }),
        avisos: z.array(EsquemaAviso),
        mensaje: z.string().nullable(),
      }),
    ),
  })
  .meta({ id: "ResultadoImportacion" });

export const EsquemaVerificarImagenesBody = z
  .object({
    filas: z
      .array(
        z
          .object({
            fila: z.number().int().min(1).max(1_048_576),
            foto_drive_id: idDeDrive("Id del archivo de Drive de la foto; vacío si no trae."),
            logo_drive_id: idDeDrive("Id del archivo de Drive del logo; vacío si no trae."),
          })
          .strict(),
      )
      .min(1)
      .max(MAXIMO_DE_FILAS_A_VERIFICAR),
  })
  .strict();

const EsquemaImagenVerificada = z.object({
  estado: z.enum(["sin_imagen", "ok", "problema", "sin_comprobar"]).meta({
    description: "`sin_imagen`: la fila no trae enlace; `ok`: se puede cargar; `problema`: el aviso dice por qué no; `sin_comprobar`: no hay conexión con Google.",
  }),
  aviso: EsquemaAviso.nullable(),
});

const EsquemaVerificacionImagenes = z
  .object({
    conexion: z.enum(["ok", "sin_conexion", "vencida"]).meta({ description: "`sin_conexion`: no llegó el token de Google; `vencida`: Google lo rechazó (hay que volver a conectar)." }),
    cuenta: z.string().nullable().meta({ description: "El correo de la cuenta conectada." }),
    filas: z.array(z.object({ fila: z.number().int(), foto: EsquemaImagenVerificada, logo: EsquemaImagenVerificada })),
  })
  .meta({ id: "VerificacionImagenes" });

const EsquemaCabeceraGoogle = z.object({
  "x-google-access-token": z.string().optional().meta({
    description: "El token de la cuenta de Google conectada (regla 17). Sin él, las imágenes quedan predeterminadas. Nunca se registra ni se guarda.",
  }),
});

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
      "previa. Los encabezados se reconocen por su texto, en la fila 1, sin importar el orden; el archivo se acepta aunque le falten columnas " +
      "(se avisa cuáles) siempre que se reconozcan al menos 4. Las columnas de foto y logo son enlaces de Drive: de cada uno se devuelve el id " +
      "del archivo (`foto_drive_id`, `logo_drive_id`) y un enlace que no sirve es una advertencia de la fila. La marca temporal y el beneficio se ignoran. " +
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
      "contraseña temporal aleatoria) y el perfil; no crea descuentos. Con la cabecera `X-Google-Access-Token` descarga de Drive la foto y el logo " +
      `de cada fila (regla 22; con imágenes, hasta ${MAXIMO_DE_FILAS_POR_TANDA_CON_IMAGENES} filas por petición) y los procesa como cualquier imagen ` +
      "(regla 16, con hasta 20 MB de entrada). Una imagen que falla deja la predeterminada (regla 11) y un aviso en la fila: nunca la detiene. " +
      "Si Google rechaza el token, 409 con el campo `google` y no se crea nada. " +
      "Vuelve a validar todo: la vista previa no se da por buena. Una cuenta cuyo correo ya existe se omite. Una fila que falla no " +
      "detiene a las demás. La contraseña temporal solo sale en esta respuesta.",
    security: AUTENTICADO,
    request: { headers: EsquemaCabeceraGoogle, body: { content: { "application/json": { schema: EsquemaFilasBody } } } },
    responses: {
      200: { description: "Resultado de cada fila.", content: { "application/json": { schema: EsquemaResultadoDeImportacion } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO", "CONFLICTO"),
    },
  });

  registro.registerPath({
    method: "post",
    path: "/admin/importaciones/emprendedoras/imagenes/verificar",
    tags: ["Importaciones"],
    summary: "Comprobar en Drive las fotos y logos de la vista previa (no escribe nada)",
    description:
      `Solo Admin (regla 22). Hasta ${MAXIMO_DE_FILAS_A_VERIFICAR} filas. Con la cuenta de Google conectada (cabecera \`X-Google-Access-Token\`), consulta en Drive ` +
      "los metadatos de cada archivo (no descarga nada) y dice, por fila, si la foto y el logo se pueden cargar. Un problema (sin acceso, no es una " +
      "imagen JPG, PNG o WebP, pesa más de 20 MB, no se pudo comprobar) es una advertencia con su mensaje, nunca un error. Sin token responde " +
      "`conexion: sin_conexion`; con un token que Google rechaza, `conexion: vencida`.",
    security: AUTENTICADO,
    request: { headers: EsquemaCabeceraGoogle, body: { content: { "application/json": { schema: EsquemaVerificarImagenesBody } } } },
    responses: {
      200: { description: "Estado de la foto y del logo de cada fila.", content: { "application/json": { schema: EsquemaVerificacionImagenes } } },
      ...respuestasDeError("VALIDACION", "NO_AUTENTICADO", "PROHIBIDO"),
    },
  });

  registro.registerPath({
    method: "get",
    path: "/admin/importaciones/emprendedoras/plantilla",
    tags: ["Importaciones"],
    summary: "Descargar la plantilla de ejemplo",
    description:
      "Solo Admin (regla 22). Un `.xlsx` con los 14 encabezados del formulario de Google Forms, en su orden, y dos filas inventadas que muestran el formato esperado.",
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
