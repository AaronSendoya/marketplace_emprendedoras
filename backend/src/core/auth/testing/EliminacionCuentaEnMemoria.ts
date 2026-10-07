import { ErrorConflicto, ErrorNoEncontrado } from "@/shared/domain/errors";
import type { IEliminacionCuentaRepository, ResumenEliminacion } from "../domain/IEliminacionCuentaRepository";
import type { UsuarioRepositoryEnMemoria } from "./UsuarioRepositoryEnMemoria";

// Doble de prueba: borra la cuenta del repositorio en memoria y devuelve lo que se le haya configurado como dependiente
// (el borrado real en cascada lo prueba la prueba de integración contra MySQL).
export class EliminacionCuentaEnMemoria implements IEliminacionCuentaRepository {
  readonly eliminadas: string[] = [];
  falla: Error | null = null;

  constructor(
    private readonly usuarios: UsuarioRepositoryEnMemoria,
    readonly dependientes: Map<string, ResumenEliminacion> = new Map(),
  ) {}

  async eliminar(usuarioId: string): Promise<ResumenEliminacion> {
    if (this.falla) throw this.falla;
    const posicion = this.usuarios.usuarios.findIndex((u) => u.id === usuarioId);
    if (posicion < 0) throw new ErrorNoEncontrado("La cuenta no existe.");
    const usuario = this.usuarios.usuarios[posicion];
    if (usuario.rol !== "Emprendedor" || !usuario.activo) throw new ErrorConflicto("La cuenta cambió mientras se eliminaba.");

    this.usuarios.usuarios.splice(posicion, 1);
    this.eliminadas.push(usuarioId);
    return this.dependientes.get(usuarioId) ?? { perfiles: 0, productos: 0, descuentos: 0, clics: 0, clavesImagenes: [] };
  }
}
