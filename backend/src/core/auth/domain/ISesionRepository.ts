// Sesiones del servidor (regla 5): cada inicio de sesión crea una, el token lleva su id y cerrar sesión la borra.
export interface ISesionRepository {
  // Crea una sesión nueva y devuelve su id (el `jti` del token). `expiraEn` null: no vence.
  crear(usuarioId: string, creadaEn: Date, expiraEn: Date | null): Promise<string>;
  // ¿Existe, es de esa cuenta y no ha vencido? Una sesión de otra cuenta cuenta como inexistente.
  estaVigente(id: string, usuarioId: string, ahora: Date): Promise<boolean>;
  // Idempotente: cerrar una sesión que ya no existe no falla. Solo borra si es de esa cuenta.
  cerrar(id: string, usuarioId: string): Promise<void>;
}
