import { obtenerCiudades } from "@/api/controllers/catalogos.controller";
import { withErrorHandling } from "@/api/middlewares/withErrorHandling";
import { GetCatalogosUseCase } from "@/core/catalogos/application/GetCatalogosUseCase";
import { MySqlCatalogoRepository } from "@/core/catalogos/infrastructure/MySqlCatalogoRepository";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";

export const GET = withErrorHandling(() =>
  obtenerCiudades(new GetCatalogosUseCase(new MySqlCatalogoRepository(getMySqlClient()))),
);
