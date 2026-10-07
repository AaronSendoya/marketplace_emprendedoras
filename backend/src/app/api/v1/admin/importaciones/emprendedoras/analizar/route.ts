import { crearAnalizarExcel } from "@/api/composicion/importaciones";
import { analizarExcel } from "@/api/controllers/importaciones.controller";
import { LIMITE_CUERPO_EXCEL, leerArchivoUnico } from "@/api/http/multipart";
import { requireAdmin } from "@/api/middlewares/requireAdmin";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";

// Regla 22: lee el Excel y devuelve la vista previa. No escribe nada y no guarda el archivo.
export const POST = withErrorHandling(
  requireAdmin(async (request) => analizarExcel(crearAnalizarExcel(), await leerArchivoUnico(request, "archivo", LIMITE_CUERPO_EXCEL))),
);
