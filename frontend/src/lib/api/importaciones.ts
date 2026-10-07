import { enviarFormDataAutenticado, enviarJsonAutenticado, obtenerBinarioAutenticado } from "./cliente";
import type { AnalisisImportacion, FilaAValidarImportacion, ResultadoFilaImportacion, ValidacionFilaImportacion } from "./tipos";

// Importación de emprendedoras desde Excel (regla 22, backend). Solo Admin. Tres operaciones y solo la última escribe.

// POST /admin/importaciones/emprendedoras/analizar: `multipart/form-data` con el campo `archivo` (un `.xlsx` de hasta 2 MB).
// Lee el archivo y devuelve cada fila normalizada, con su estado y sus avisos. No crea nada y no guarda el archivo.
export const analizarExcelEmprendedoras = (formData: FormData) =>
  enviarFormDataAutenticado<AnalisisImportacion>("/admin/importaciones/emprendedoras/analizar", formData);

// POST /admin/importaciones/emprendedoras/validar: vuelve a revisar filas que el Admin corrigió (hasta 10). No escribe nada.
export const validarFilasEmprendedoras = (filas: FilaAValidarImportacion[]) =>
  enviarJsonAutenticado<{ filas: ValidacionFilaImportacion[] }>("/admin/importaciones/emprendedoras/validar", { filas });

// POST /admin/importaciones/emprendedoras: crea cuenta y perfil de cada fila (hasta 10 por petición). La contraseña temporal
// de cada cuenta nueva sale solo en esta respuesta.
export const importarEmprendedoras = (filas: FilaAValidarImportacion[]) =>
  enviarJsonAutenticado<{ resultados: ResultadoFilaImportacion[] }>("/admin/importaciones/emprendedoras", { filas });

// GET /admin/importaciones/emprendedoras/plantilla: un `.xlsx` de ejemplo con los encabezados del formulario de Google Forms.
export const descargarPlantillaEmprendedoras = () => obtenerBinarioAutenticado("/admin/importaciones/emprendedoras/plantilla");
