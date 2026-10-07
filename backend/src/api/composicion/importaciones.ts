import { crearCreateUsuario } from "@/api/composicion/auth";
import { crearCreatePerfil } from "@/api/composicion/perfiles";
import { MySqlUsuarioRepository } from "@/core/auth/infrastructure/MySqlUsuarioRepository";
import { MySqlCatalogoRepository } from "@/core/catalogos/infrastructure/MySqlCatalogoRepository";
import { AnalizarExcelEmprendedorasUseCase } from "@/core/importaciones/application/AnalizarExcelEmprendedoras";
import { ImportarEmprendedorasUseCase, ValidarFilasEmprendedorasUseCase } from "@/core/importaciones/application/ImportarEmprendedoras";
import { GeneradorPlantillaExceljs } from "@/core/importaciones/infrastructure/GeneradorPlantillaExceljs";
import { LectorExcelExceljs } from "@/core/importaciones/infrastructure/LectorExcelExceljs";
import { logger } from "@/shared/infrastructure/logger";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";

// Cableado de la importación de emprendedoras (regla 22): reutiliza los casos de uso que ya crean cuentas y perfiles, así
// que las mismas reglas valen aquí y allí. Las rutas no lo repiten.
function dependencias() {
  const db = getMySqlClient();
  return { usuarios: new MySqlUsuarioRepository(db), catalogos: new MySqlCatalogoRepository(db) };
}

export function crearAnalizarExcel(): AnalizarExcelEmprendedorasUseCase {
  const { usuarios, catalogos } = dependencias();
  return new AnalizarExcelEmprendedorasUseCase(new LectorExcelExceljs(), usuarios, catalogos);
}

export function crearValidarFilas(): ValidarFilasEmprendedorasUseCase {
  const { usuarios, catalogos } = dependencias();
  return new ValidarFilasEmprendedorasUseCase(usuarios, catalogos);
}

export function crearImportarEmprendedoras(): ImportarEmprendedorasUseCase {
  const { usuarios, catalogos } = dependencias();
  return new ImportarEmprendedorasUseCase(usuarios, catalogos, crearCreateUsuario(), crearCreatePerfil(), logger);
}

export const crearGeneradorPlantilla = () => new GeneradorPlantillaExceljs();
