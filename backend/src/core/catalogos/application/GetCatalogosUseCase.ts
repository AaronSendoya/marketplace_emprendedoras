import type { Ciudad } from "../domain/Ciudad";
import type { ICatalogoRepository } from "../domain/ICatalogoRepository";
import type { Rubro } from "../domain/Rubro";

// Sin reglas propias todavía: existe para que el controlador dependa de la aplicación y no
// directamente del repositorio, y para que un filtro futuro (p. ej. solo ciudades con perfiles)
// tenga un lugar natural sin tocar la infraestructura ni el controlador.
export class GetCatalogosUseCase {
  constructor(private readonly repositorio: ICatalogoRepository) {}

  ciudades(): Promise<Ciudad[]> {
    return this.repositorio.listarCiudades();
  }

  rubros(): Promise<Rubro[]> {
    return this.repositorio.listarRubros();
  }
}
