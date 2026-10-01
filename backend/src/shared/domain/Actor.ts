import type { NombreRol } from "@/core/auth/domain/Rol";

// Quien hace la petición (ya autenticado): el rol siempre sale de la base (regla 5).
export interface Actor {
  id: string;
  rol: NombreRol;
}
