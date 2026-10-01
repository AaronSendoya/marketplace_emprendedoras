import { ErrorNoEncontrado } from "@/shared/domain/errors";
import type { IUsuarioRepository } from "../domain/IUsuarioRepository";
import type { Usuario } from "../domain/Usuario";

export class GetUsuarioUseCase {
  constructor(private readonly usuarios: IUsuarioRepository) {}

  async ejecutar(id: string): Promise<Usuario> {
    const usuario = await this.usuarios.buscarPorId(id);
    if (!usuario) throw new ErrorNoEncontrado("La cuenta no existe.");
    return usuario;
  }
}
