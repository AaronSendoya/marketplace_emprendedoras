import type { EjecutorSql } from "@/shared/infrastructure/MySqlClient";
import type { Ciudad } from "../domain/Ciudad";
import type { ICatalogoRepository } from "../domain/ICatalogoRepository";
import type { Rubro } from "../domain/Rubro";

export class MySqlCatalogoRepository implements ICatalogoRepository {
  constructor(private readonly db: EjecutorSql) {}

  listarCiudades(): Promise<Ciudad[]> {
    return this.db.consultar<Ciudad>("SELECT id, nombre FROM ciudades ORDER BY nombre");
  }

  listarRubros(): Promise<Rubro[]> {
    return this.db.consultar<Rubro>("SELECT id, nombre FROM rubros ORDER BY nombre");
  }
}
