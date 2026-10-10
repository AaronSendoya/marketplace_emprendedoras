import type { ISesionRepository } from "../domain/ISesionRepository";
import type { ITokenService } from "../domain/ITokenService";
import type { NombreRol } from "../domain/Rol";
import { expiracionDeSesion } from "../domain/Sesion";

export interface SesionGuardada {
  id: string;
  usuarioId: string;
  creadaEn: Date;
  expiraEn: Date | null;
}

// Doble en memoria de las sesiones del servidor (regla 5): prueba la lógica de los casos de uso y de requireAuth sin base.
export class SesionRepositoryEnMemoria implements ISesionRepository {
  readonly sesiones: SesionGuardada[] = [];
  private contador = 0;

  async crear(usuarioId: string, creadaEn: Date, expiraEn: Date | null): Promise<string> {
    const id = `sesion-${++this.contador}`;
    this.sesiones.push({ id, usuarioId, creadaEn, expiraEn });
    return id;
  }

  async estaVigente(id: string, usuarioId: string, ahora: Date): Promise<boolean> {
    return this.sesiones.some((s) => s.id === id && s.usuarioId === usuarioId && (s.expiraEn === null || s.expiraEn.getTime() > ahora.getTime()));
  }

  async cerrar(id: string, usuarioId: string): Promise<void> {
    const indice = this.sesiones.findIndex((s) => s.id === id && s.usuarioId === usuarioId);
    if (indice >= 0) this.sesiones.splice(indice, 1);
  }
}

// Lo que hace un inicio de sesión: abre una sesión y emite el token que la lleva. Para las pruebas que necesitan un token válido.
export async function emitirConSesion(
  tokens: ITokenService,
  sesiones: SesionRepositoryEnMemoria,
  usuario: { id: string; tokenVersion: number; rol: NombreRol },
  ahora: Date = new Date(),
): Promise<string> {
  const sesionId = await sesiones.crear(usuario.id, ahora, expiracionDeSesion(usuario.rol, ahora));
  return tokens.emitir({ ...usuario, sesionId });
}
