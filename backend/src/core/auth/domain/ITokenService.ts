import type { NombreRol } from "./Rol";

// Lo que lleva el token verificado. Nunca `rol`: el rol se lee siempre de la base (regla 5).
export interface CargaToken {
  sub: string;
  tv: number;
  // Id de la sesión del servidor a la que pertenece el token (regla 5): cada inicio de sesión tiene la suya.
  jti: string;
}

export interface ITokenService {
  // `rol` decide la vigencia al emitir (Admin 4 h, Emprendedor sin exp) pero no viaja en el token. `sesionId` es la sesión que se
  // acaba de crear para este inicio de sesión: viaja como `jti`.
  emitir(usuario: { id: string; tokenVersion: number; rol: NombreRol; sesionId: string }): Promise<string>;
  // Firma inválida, formato inválido, vencido o sin `jti`: todo se rechaza igual (ErrorNoAutenticado).
  verificar(token: string): Promise<CargaToken>;
}
