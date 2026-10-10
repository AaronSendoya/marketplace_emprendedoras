import { crearCreateUsuario } from "@/api/composicion/auth";
import { crearCreatePerfil } from "@/api/composicion/perfiles";
import { MySqlUsuarioRepository } from "@/core/auth/infrastructure/MySqlUsuarioRepository";
import { MySqlCatalogoRepository } from "@/core/catalogos/infrastructure/MySqlCatalogoRepository";
import { AnalizarExcelEmprendedorasUseCase } from "@/core/importaciones/application/AnalizarExcelEmprendedoras";
import {
  ConectarGoogleUseCase,
  EstadoDeGoogleUseCase,
  UrlDeAutorizacionDeGoogleUseCase,
} from "@/core/importaciones/application/ConexionGoogle";
import { ImportarEmprendedorasUseCase, ValidarFilasEmprendedorasUseCase } from "@/core/importaciones/application/ImportarEmprendedoras";
import { VerificarImagenesDriveUseCase } from "@/core/importaciones/application/VerificarImagenesDrive";
import { GeneradorPlantillaExceljs } from "@/core/importaciones/infrastructure/GeneradorPlantillaExceljs";
import {
  GoogleDriveHttp,
  URL_BASE_DE_DRIVE,
} from "@/core/importaciones/infrastructure/GoogleDriveHttp";
import {
  GoogleOAuthHttp,
  URL_DE_AUTORIZACION_DE_GOOGLE,
  URL_DEL_TOKEN_DE_GOOGLE,
  type ConfiguracionDeGoogle,
} from "@/core/importaciones/infrastructure/GoogleOAuthHttp";
import { LectorExcelExceljs } from "@/core/importaciones/infrastructure/LectorExcelExceljs";
import { getEnv, type Env } from "@/shared/config/env";
import { ImageProcessorService } from "@/shared/infrastructure/ImageProcessorService";
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

type EnvGoogle = Pick<Env, "APP_ENV" | "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "GOOGLE_REDIRECT_URI" | "GOOGLE_SIMULADO_URL">;

// `null` cuando faltan las variables GOOGLE_*: el importador funciona como antes. `GOOGLE_SIMULADO_URL` (solo desarrollo y pruebas; env.ts la
// prohíbe en producción) sustituye a los tres servidores de Google por uno simulado; en producción se ignora aunque llegara a estar.
export function configuracionDeGoogle(env: EnvGoogle = getEnv()): { oauth: ConfiguracionDeGoogle; baseDeDrive: string } | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) return null;
  const simulado = env.APP_ENV === "production" ? undefined : env.GOOGLE_SIMULADO_URL;
  return {
    oauth: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: GOOGLE_REDIRECT_URI,
      urlDeAutorizacion: simulado ? `${simulado}/o/oauth2/v2/auth` : URL_DE_AUTORIZACION_DE_GOOGLE,
      urlDelToken: simulado ? `${simulado}/token` : URL_DEL_TOKEN_DE_GOOGLE,
    },
    baseDeDrive: simulado ? `${simulado}/drive/v3` : URL_BASE_DE_DRIVE,
  };
}

function googleDeLaConfiguracion() {
  const configuracion = configuracionDeGoogle();
  return {
    oauth: new GoogleOAuthHttp(configuracion?.oauth ?? null),
    drive: new GoogleDriveHttp(configuracion?.baseDeDrive ?? URL_BASE_DE_DRIVE),
  };
}

export const crearEstadoDeGoogle = () => new EstadoDeGoogleUseCase(googleDeLaConfiguracion().oauth);
export const crearUrlDeAutorizacionDeGoogle = () => new UrlDeAutorizacionDeGoogleUseCase(googleDeLaConfiguracion().oauth);

export function crearConectarGoogle(): ConectarGoogleUseCase {
  const { oauth, drive } = googleDeLaConfiguracion();
  return new ConectarGoogleUseCase(oauth, drive, logger);
}

export const crearVerificarImagenesDrive = () => new VerificarImagenesDriveUseCase(googleDeLaConfiguracion().drive);

export function crearImportarEmprendedoras(): ImportarEmprendedorasUseCase {
  const { usuarios, catalogos } = dependencias();
  const { drive } = googleDeLaConfiguracion();
  return new ImportarEmprendedorasUseCase(usuarios, catalogos, crearCreateUsuario(), crearCreatePerfil(), logger, drive, new ImageProcessorService());
}

export const crearGeneradorPlantilla = () => new GeneradorPlantillaExceljs();
