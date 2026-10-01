import type { Actor } from "@/shared/domain/Actor";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/shared/domain/errors";
import type { IPerfilRepository } from "../domain/IPerfilRepository";
import type { Perfil } from "../domain/Perfil";

// A qué perfil pertenece lo que se crea (un producto, un descuento) según quién lo pide (regla 18):
// la emprendedora, al suyo (si indica otro, 403); el Admin debe indicar cuál (`perfil_id`).
export async function resolverPerfilDeGestion(
  perfiles: Pick<IPerfilRepository, "buscarPorId" | "buscarPorUsuarioId">,
  actor: Actor,
  perfilIdIndicado: string | undefined,
): Promise<Perfil> {
  if (actor.rol === "Admin") {
    if (!perfilIdIndicado) {
      const mensaje = "Indica el perfil al que pertenece.";
      throw new ErrorValidacion(mensaje, [{ campo: "perfil_id", mensaje }]);
    }
    const perfil = await perfiles.buscarPorId(perfilIdIndicado);
    if (!perfil) throw new ErrorNoEncontrado("El perfil no existe.");
    return perfil;
  }

  const propio = await perfiles.buscarPorUsuarioId(actor.id);
  if (!propio) throw new ErrorConflicto("Primero crea tu perfil.");
  if (perfilIdIndicado && perfilIdIndicado !== propio.id) throw new ErrorProhibido("Solo puedes usar tu propio perfil.");
  return propio;
}
