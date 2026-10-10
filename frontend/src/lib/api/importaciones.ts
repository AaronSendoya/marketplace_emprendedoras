import {
  enviarFormDataAutenticado,
  enviarJsonAutenticado,
  obtenerBinarioAutenticado,
  obtenerJsonAutenticado,
  TIEMPO_IMPORTACION_CON_IMAGENES_MS,
  TIEMPO_VERIFICACION_IMAGENES_MS,
} from "./cliente";
import type {
  AnalisisImportacion,
  ConexionGoogle,
  EstadoGoogle,
  FilaAValidarImportacion,
  FilaAVerificarImagenes,
  ResultadoFilaImportacion,
  UrlGoogle,
  ValidacionFilaImportacion,
  VerificacionImagenes,
} from "./tipos";

// El token de la cuenta de Google conectada viaja en esta cabecera (regla 17); el backend lo lee de ahí y no lo guarda.
const CABECERA_TOKEN_DE_GOOGLE = "X-Google-Access-Token";
const conToken = (tokenGoogle: string | null) => (tokenGoogle ? { [CABECERA_TOKEN_DE_GOOGLE]: tokenGoogle } : undefined);

// Importación de emprendedoras desde Excel (regla 22, backend). Solo Admin. Tres operaciones y solo la última escribe.

// POST /admin/importaciones/emprendedoras/analizar: `multipart/form-data` con el campo `archivo` (un `.xlsx` de hasta 2 MB).
// Lee el archivo y devuelve cada fila normalizada, con su estado y sus avisos. No crea nada y no guarda el archivo.
export const analizarExcelEmprendedoras = (formData: FormData) =>
  enviarFormDataAutenticado<AnalisisImportacion>("/admin/importaciones/emprendedoras/analizar", formData);

// POST /admin/importaciones/emprendedoras/validar: vuelve a revisar filas que el Admin corrigió (hasta 10). No escribe nada.
export const validarFilasEmprendedoras = (filas: FilaAValidarImportacion[]) =>
  enviarJsonAutenticado<{ filas: ValidacionFilaImportacion[] }>("/admin/importaciones/emprendedoras/validar", { filas });

// POST /admin/importaciones/emprendedoras: crea cuenta y perfil de cada fila (hasta 10 por petición, 5 si lleva imágenes de Drive).
// La contraseña temporal de cada cuenta nueva sale solo en esta respuesta. Con `tokenGoogle` descarga la foto y el logo de cada fila.
export const importarEmprendedoras = (filas: FilaAValidarImportacion[], tokenGoogle: string | null = null) =>
  enviarJsonAutenticado<{ resultados: ResultadoFilaImportacion[] }>(
    "/admin/importaciones/emprendedoras",
    { filas },
    { cabeceras: conToken(tokenGoogle), tiempoMs: tokenGoogle ? TIEMPO_IMPORTACION_CON_IMAGENES_MS : undefined },
  );

// POST /admin/importaciones/emprendedoras/imagenes/verificar: consulta en Drive (sin descargar) si la foto y el logo de hasta 25
// filas se pueden cargar. Un problema es una advertencia con su mensaje, nunca un error.
export const verificarImagenesEmprendedoras = (filas: FilaAVerificarImagenes[], tokenGoogle: string | null) =>
  enviarJsonAutenticado<VerificacionImagenes>(
    "/admin/importaciones/emprendedoras/imagenes/verificar",
    { filas },
    { cabeceras: conToken(tokenGoogle), tiempoMs: TIEMPO_VERIFICACION_IMAGENES_MS },
  );

// Conexión con Google (regla 17). Solo Admin.
export const obtenerEstadoGoogle = () => obtenerJsonAutenticado<EstadoGoogle>("/admin/google/estado");

export const obtenerUrlDeAutorizacionGoogle = (state: string, codeChallenge: string) =>
  obtenerJsonAutenticado<UrlGoogle>("/admin/google/autorizacion", { parametros: { state, code_challenge: codeChallenge } });

export const conectarGoogle = (codigo: string, codeVerifier: string) =>
  enviarJsonAutenticado<ConexionGoogle>("/admin/google/conexion", { codigo, code_verifier: codeVerifier });

// GET /admin/importaciones/emprendedoras/plantilla: un `.xlsx` de ejemplo con los encabezados del formulario de Google Forms.
export const descargarPlantillaEmprendedoras = () => obtenerBinarioAutenticado("/admin/importaciones/emprendedoras/plantilla");
