import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { CambiosUsuario, FiltrosUsuarios, NuevoUsuario, Usuario, UsuarioConPerfil } from "./Usuario";

export interface IUsuarioRepository {
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  // Lanza ErrorConflicto si el correo ya tiene cuenta. El rol se busca por nombre.
  crear(datos: NuevoUsuario): Promise<Usuario>;
  // Más recientes primero. Sin el hash de la contraseña: no hace falta para un listado. Cada cuenta trae su perfil (o `null`).
  listar(filtros: FiltrosUsuarios, pagina: ParametrosPagina): Promise<Pagina<UsuarioConPerfil>>;
  // Solo cambia `activo` (regla 5: desactivar revoca el acceso, no borra nada).
  cambiarEstado(id: string, activo: boolean): Promise<void>;
  // Regla 5: el Admin edita nombres/apellidos/correo sin OTP. Solo toca las columnas presentes.
  // Lanza ErrorConflicto si el correo nuevo ya tiene cuenta.
  actualizar(id: string, cambios: CambiosUsuario): Promise<void>;
  // Regla 15: guarda el hash nuevo e incrementa token_version, lo que invalida las demás sesiones
  // (regla 5). El OTP demostró que la persona controla el correo: si aún no estaba verificado, queda
  // verificado.
  restablecerPassword(id: string, passwordHash: string, ahora: Date): Promise<void>;
  // Regla 5: el Admin cambia la contraseña de cualquier cuenta directamente, sin OTP. Igual que
  // arriba, invalida las demás sesiones; a diferencia de `restablecerPassword`, no toca
  // `email_verificado_en` (nadie demostró controlar el correo, fue el Admin quien actuó).
  cambiarPasswordAdmin(id: string, passwordHash: string): Promise<void>;
  // Regla 15: el correo nuevo ya se verificó con su OTP. Lanza ErrorConflicto si ya tiene cuenta.
  cambiarEmail(id: string, email: string, ahora: Date): Promise<void>;
}
