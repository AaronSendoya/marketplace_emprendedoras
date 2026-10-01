import type { NombreRol } from "./Rol";

// Lo que lleva el token verificado. Nunca `rol`: el rol se lee siempre de la base (regla 5).
export interface CargaToken {
  sub: string;
  tv: number;
}

export interface ITokenService {
  // `rol` decide la vigencia al emitir (Admin 24 h, Emprendedor sin exp) pero no viaja en el token.
  emitir(usuario: { id: string; tokenVersion: number; rol: NombreRol }): Promise<string>;
  // Firma inválida, formato inválido o vencido: todo se rechaza igual (ErrorNoAutenticado).
  verificar(token: string): Promise<CargaToken>;
}
