import type { NombreRol } from "./Rol";

// Regla 5: la sesión de un Admin vence a las 4 horas de iniciarla (tope absoluto, sin renovación por actividad); la de una
// Emprendedora no vence y dura hasta que cierre sesión, cambie su contraseña o suspendan su cuenta. El token de cada rol
// vence igual que su sesión (JwtTokenService usa esta misma constante).
export const DURACION_SESION_ADMIN_SEGUNDOS = 4 * 60 * 60;

// Cuándo vence una sesión que empieza en `creadaEn`, o null si no vence.
export function expiracionDeSesion(rol: NombreRol, creadaEn: Date): Date | null {
  return rol === "Admin" ? new Date(creadaEn.getTime() + DURACION_SESION_ADMIN_SEGUNDOS * 1000) : null;
}
