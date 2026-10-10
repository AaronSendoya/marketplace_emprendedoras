import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import { ErrorConflicto } from "@/shared/domain/errors";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import type { CambiosUsuario, FiltrosUsuarios, NuevoUsuario, Usuario, UsuarioConPerfil } from "../domain/Usuario";

// Doble de prueba: replica lo que hace el SQL real (token_version, correo verificado, correo único).
export class UsuarioRepositoryEnMemoria implements IUsuarioRepository {
  // Perfiles por id de cuenta (`{ id, nombreNegocio }`), para probar el listado con y sin perfil.
  readonly perfiles = new Map<string, { id: string; nombreNegocio: string }>();

  constructor(readonly usuarios: Usuario[] = []) {}

  async buscarPorEmail(email: string) {
    return this.usuarios.find((u) => u.email === email) ?? null;
  }

  async buscarPorId(id: string) {
    return this.usuarios.find((u) => u.id === id) ?? null;
  }

  async crear(datos: NuevoUsuario) {
    if (this.usuarios.some((u) => u.email === datos.email)) throw new ErrorConflicto("Ya existe una cuenta con ese correo.");
    const usuario: Usuario = { ...datos, id: `usuario-${this.usuarios.length + 1}`, activo: true, tokenVersion: 0 };
    this.usuarios.push(usuario);
    return { ...usuario };
  }

  async listar(filtros: FiltrosUsuarios, pagina: ParametrosPagina): Promise<Pagina<UsuarioConPerfil>> {
    const q = filtros.q?.toLowerCase();
    const filtrados = this.usuarios.filter((u) => {
      if (filtros.activo !== undefined && u.activo !== filtros.activo) return false;
      if (filtros.rol !== undefined && u.rol !== filtros.rol) return false;
      if (filtros.conPerfil !== undefined && this.perfiles.has(u.id) !== filtros.conPerfil) return false;
      if (q && ![u.nombres, u.apellidoPaterno, u.apellidoMaterno, u.email].some((campo) => campo?.toLowerCase().includes(q))) return false;
      return true;
    });
    const recientes = filtrados.sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
    // El real no trae el hash; el doble devuelve el usuario entero y el serializador lo omite igual.
    const datos = recientes
      .slice(desplazamiento(pagina), desplazamiento(pagina) + pagina.limite)
      .map((u) => ({ ...u, perfil: this.perfiles.get(u.id) ?? null }));
    return { datos, total: filtrados.length };
  }

  async cambiarEstado(id: string, activo: boolean) {
    this.requerir(id).activo = activo;
  }

  async actualizar(id: string, cambios: CambiosUsuario) {
    const usuario = this.requerir(id);
    if (cambios.email !== undefined && this.usuarios.some((u) => u.email === cambios.email && u.id !== id)) {
      throw new ErrorConflicto("Ya existe una cuenta con ese correo.");
    }
    if (cambios.nombres !== undefined) usuario.nombres = cambios.nombres;
    if (cambios.apellidoPaterno !== undefined) usuario.apellidoPaterno = cambios.apellidoPaterno;
    if (cambios.apellidoMaterno !== undefined) usuario.apellidoMaterno = cambios.apellidoMaterno;
    if (cambios.email !== undefined) usuario.email = cambios.email;
    if (cambios.emailVerificadoEn !== undefined) usuario.emailVerificadoEn = cambios.emailVerificadoEn;
  }

  async restablecerPassword(id: string, passwordHash: string, ahora: Date) {
    const usuario = this.requerir(id);
    usuario.passwordHash = passwordHash;
    usuario.tokenVersion += 1;
    usuario.emailVerificadoEn ??= ahora;
  }

  async cambiarPasswordAdmin(id: string, passwordHash: string) {
    const usuario = this.requerir(id);
    usuario.passwordHash = passwordHash;
    usuario.tokenVersion += 1;
  }

  async cambiarEmail(id: string, email: string, ahora: Date) {
    if (this.usuarios.some((u) => u.email === email && u.id !== id)) throw new ErrorConflicto("Ya existe una cuenta con ese correo.");
    const usuario = this.requerir(id);
    usuario.email = email;
    usuario.emailVerificadoEn = ahora;
  }

  private requerir(id: string): Usuario {
    const usuario = this.usuarios.find((u) => u.id === id);
    if (!usuario) throw new Error(`usuario ${id} no existe en el doble de prueba`);
    return usuario;
  }
}
