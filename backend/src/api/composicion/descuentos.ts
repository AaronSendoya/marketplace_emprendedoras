import {
  AsignarDescuentoAProductoUseCase,
  CreateDescuentoUseCase,
  ListMisDescuentosUseCase,
  QuitarDescuentoDeProductoUseCase,
  UpdateDescuentoUseCase,
} from "@/core/descuentos/application/DescuentoUseCases";
import { MySqlDescuentoRepository } from "@/core/descuentos/infrastructure/MySqlDescuentoRepository";
import { MySqlPerfilRepository } from "@/core/perfiles/infrastructure/MySqlPerfilRepository";
import { MySqlProductoRepository } from "@/core/productos/infrastructure/MySqlProductoRepository";
import { logger } from "@/shared/infrastructure/logger";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";
import { SystemClock } from "@/shared/infrastructure/SystemClock";

// Cableado de los casos de uso de descuentos: las rutas no lo repiten.
function dependencias() {
  const db = getMySqlClient();
  return {
    descuentos: new MySqlDescuentoRepository(db),
    perfiles: new MySqlPerfilRepository(db),
    productos: new MySqlProductoRepository(db),
    clock: new SystemClock(),
  };
}

export function crearCreateDescuento(): CreateDescuentoUseCase {
  const { descuentos, perfiles, clock } = dependencias();
  return new CreateDescuentoUseCase(descuentos, perfiles, clock, logger);
}

export function crearUpdateDescuento(): UpdateDescuentoUseCase {
  const { descuentos, clock } = dependencias();
  return new UpdateDescuentoUseCase(descuentos, clock, logger);
}

export function crearListMisDescuentos(): ListMisDescuentosUseCase {
  const { descuentos, perfiles, clock } = dependencias();
  return new ListMisDescuentosUseCase(descuentos, perfiles, clock);
}

export function crearAsignarDescuento(): AsignarDescuentoAProductoUseCase {
  const { descuentos, productos, clock } = dependencias();
  return new AsignarDescuentoAProductoUseCase(descuentos, productos, clock, logger);
}

export function crearQuitarDescuento(): QuitarDescuentoDeProductoUseCase {
  return new QuitarDescuentoDeProductoUseCase(dependencias().descuentos, logger);
}
