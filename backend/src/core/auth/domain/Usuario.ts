import type { NombreRol } from "./Rol";

export interface Usuario {
  id: string;
  email: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  passwordHash: string;
  rol: NombreRol;
  activo: boolean;
  emailVerificadoEn: Date | null;
  tokenVersion: number;
  creadoEn: Date;
}

// Lo que recibe un manejador autenticado: nunca el hash de la contraseña (regla 17, exposición
// de datos sensibles), aunque el repositorio sí lo necesite para LoginUseCase.
export type UsuarioAutenticado = Omit<Usuario, "passwordHash">;

// Datos para dar de alta una cuenta. El rol lo decide el caso de uso, nunca la petición (regla 5).
// `emailVerificadoEn` nulo: el alta ya no pide OTP (regla 15), el correo queda sin verificar hasta
// el primer código que complete esa cuenta.
export interface NuevoUsuario {
  email: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  passwordHash: string;
  rol: NombreRol;
  emailVerificadoEn: Date | null;
  creadoEn: Date;
}

// Regla 5: búsqueda por texto libre (nombres, apellidos o correo) y filtros por estado, rol y perfil,
// para el listado de cuentas del Admin (regla 18: la pantalla de Emprendimientos pide solo las cuentas
// Emprendedor y las separa entre las que ya tienen perfil y las que no).
export interface FiltrosUsuarios {
  q?: string;
  activo?: boolean;
  rol?: NombreRol;
  // `true`: solo las que tienen perfil; `false`: solo las que todavía no.
  conPerfil?: boolean;
}

// Una cuenta del listado del Admin con el nombre de su negocio (regla 18); `perfil` es `null` si todavía no tiene.
export type UsuarioConPerfil = UsuarioAutenticado & { perfil: { id: string; nombreNegocio: string } | null };

// Regla 5: edición de cuenta por el Admin, sin OTP. Todos los campos son opcionales (solo se
// actualiza lo presente); `emailVerificadoEn` lo decide el caso de uso, no quien llama al
// repositorio: `null` cuando el correo cambia (nadie demostró controlarlo), `undefined` si no.
export interface CambiosUsuario {
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string | null;
  email?: string;
  emailVerificadoEn?: Date | null;
}

// Regla 10: nombre_completo es derivado y no se guarda en la base; la API lo compone al responder.
export function nombreCompleto(usuario: Pick<Usuario, "nombres" | "apellidoPaterno" | "apellidoMaterno">): string {
  return [usuario.nombres, usuario.apellidoPaterno, usuario.apellidoMaterno].filter(Boolean).join(" ");
}
