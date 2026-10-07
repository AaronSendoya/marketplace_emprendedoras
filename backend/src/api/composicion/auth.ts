import { ActualizarUsuarioUseCase } from "@/core/auth/application/ActualizarUsuarioUseCase";
import { AdminRestablecerPasswordUseCase } from "@/core/auth/application/AdminRestablecerPasswordUseCase";
import { CambiarEmailUseCase } from "@/core/auth/application/CambiarEmailUseCase";
import { CambiarEstadoUsuarioUseCase } from "@/core/auth/application/CambiarEstadoUsuarioUseCase";
import { CreateUsuarioUseCase } from "@/core/auth/application/CreateUsuarioUseCase";
import { EliminarCuentaUseCase } from "@/core/auth/application/EliminarCuentaUseCase";
import { GetUsuarioUseCase } from "@/core/auth/application/GetUsuarioUseCase";
import { ListUsuariosUseCase } from "@/core/auth/application/ListUsuariosUseCase";
import { RequestOtpUseCase } from "@/core/auth/application/RequestOtpUseCase";
import { ResetPasswordUseCase } from "@/core/auth/application/ResetPasswordUseCase";
import { VerificadorOtp } from "@/core/auth/application/VerificadorOtp";
import { BcryptPasswordHasher } from "@/core/auth/infrastructure/BcryptPasswordHasher";
import { generarCodigoOtp } from "@/core/auth/infrastructure/generarCodigoOtp";
import { generarPasswordTemporal } from "@/core/auth/infrastructure/generarPasswordTemporal";
import { MySqlEliminacionCuentaRepository } from "@/core/auth/infrastructure/MySqlEliminacionCuentaRepository";
import { MySqlOtpRepository } from "@/core/auth/infrastructure/MySqlOtpRepository";
import { MySqlUsuarioRepository } from "@/core/auth/infrastructure/MySqlUsuarioRepository";
import { crearEmailSender } from "@/shared/infrastructure/crearEmailSender";
import { imageStoragePorDefecto } from "@/shared/infrastructure/crearImageStorage";
import { logger } from "@/shared/infrastructure/logger";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";
import { SystemClock } from "@/shared/infrastructure/SystemClock";

// Cableado de los casos de uso de cuentas y OTP: las rutas de /auth y /admin no lo repiten.
function dependencias() {
  const db = getMySqlClient();
  const hasher = new BcryptPasswordHasher();
  const clock = new SystemClock();
  const usuarios = new MySqlUsuarioRepository(db);
  const otps = new MySqlOtpRepository(db);
  return { hasher, clock, usuarios, otps, verificador: new VerificadorOtp(otps, hasher, clock) };
}

export function crearRequestOtp(): RequestOtpUseCase {
  const { otps, usuarios, hasher, clock } = dependencias();
  return new RequestOtpUseCase(otps, usuarios, hasher, crearEmailSender(), clock, logger, generarCodigoOtp);
}

export function crearResetPassword(): ResetPasswordUseCase {
  const { verificador, usuarios, hasher, clock } = dependencias();
  return new ResetPasswordUseCase(verificador, usuarios, hasher, clock, logger);
}

export function crearCambiarEmail(): CambiarEmailUseCase {
  const { verificador, usuarios, clock } = dependencias();
  return new CambiarEmailUseCase(verificador, usuarios, clock, logger);
}

export function crearCreateUsuario(): CreateUsuarioUseCase {
  const { usuarios, hasher, clock } = dependencias();
  return new CreateUsuarioUseCase(usuarios, hasher, clock, logger, generarPasswordTemporal);
}

export function crearListUsuarios(): ListUsuariosUseCase {
  return new ListUsuariosUseCase(dependencias().usuarios);
}

export function crearGetUsuario(): GetUsuarioUseCase {
  return new GetUsuarioUseCase(dependencias().usuarios);
}

export function crearCambiarEstadoUsuario(): CambiarEstadoUsuarioUseCase {
  return new CambiarEstadoUsuarioUseCase(dependencias().usuarios, logger);
}

export function crearEliminarCuenta(): EliminarCuentaUseCase {
  const db = getMySqlClient();
  return new EliminarCuentaUseCase(dependencias().usuarios, new MySqlEliminacionCuentaRepository(db), imageStoragePorDefecto(), logger);
}

export function crearActualizarUsuario(): ActualizarUsuarioUseCase {
  return new ActualizarUsuarioUseCase(dependencias().usuarios, logger);
}

export function crearAdminRestablecerPassword(): AdminRestablecerPasswordUseCase {
  const { usuarios, hasher } = dependencias();
  return new AdminRestablecerPasswordUseCase(usuarios, hasher, logger, generarPasswordTemporal);
}
