import type { Ciudad } from "./Ciudad";
import type { Rubro } from "./Rubro";

export interface ICatalogoRepository {
  listarCiudades(): Promise<Ciudad[]>;
  listarRubros(): Promise<Rubro[]>;
}
