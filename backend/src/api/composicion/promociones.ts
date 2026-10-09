import { GetPromocionesUseCase, GetPromocionUseCase } from "@/core/descuentos/application/ConsultasPromocion";
import { MySqlPromocionRepository } from "@/core/descuentos/infrastructure/MySqlPromocionRepository";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";
import { SystemClock } from "@/shared/infrastructure/SystemClock";

// Cableado de las promociones públicas (regla 23): las rutas no lo repiten.
const repositorio = () => new MySqlPromocionRepository(getMySqlClient());

export const crearGetPromociones = () => new GetPromocionesUseCase(repositorio(), new SystemClock());
export const crearGetPromocion = () => new GetPromocionUseCase(repositorio(), new SystemClock());
