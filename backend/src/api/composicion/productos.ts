import { MySqlPerfilRepository } from "@/core/perfiles/infrastructure/MySqlPerfilRepository";
import {
  GetMarketplaceUseCase,
  GetProductoMarketplaceUseCase,
  ListMisProductosUseCase,
} from "@/core/productos/application/ConsultasProducto";
import { CreateProductoUseCase } from "@/core/productos/application/CreateProductoUseCase";
import {
  DeactivateProductoUseCase,
  ReemplazarImagenProductoUseCase,
  UpdateProductoUseCase,
} from "@/core/productos/application/GestionProductoUseCases";
import { MySqlProductoRepository } from "@/core/productos/infrastructure/MySqlProductoRepository";
import { imageStoragePorDefecto } from "@/shared/infrastructure/crearImageStorage";
import { ImageProcessorService } from "@/shared/infrastructure/ImageProcessorService";
import { logger } from "@/shared/infrastructure/logger";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";
import { SystemClock } from "@/shared/infrastructure/SystemClock";

// Cableado de los casos de uso de productos: las rutas no lo repiten.
function dependencias() {
  const db = getMySqlClient();
  return {
    productos: new MySqlProductoRepository(db),
    perfiles: new MySqlPerfilRepository(db),
    procesador: new ImageProcessorService(),
    almacenamiento: imageStoragePorDefecto(),
    clock: new SystemClock(),
  };
}

export const crearGetMarketplace = () => new GetMarketplaceUseCase(dependencias().productos, new SystemClock());
export const crearGetProductoMarketplace = () => new GetProductoMarketplaceUseCase(dependencias().productos, new SystemClock());

export function crearListMisProductos(): ListMisProductosUseCase {
  const { productos, perfiles, clock } = dependencias();
  return new ListMisProductosUseCase(productos, perfiles, clock);
}

export function crearCreateProducto(): CreateProductoUseCase {
  const { productos, perfiles, procesador, almacenamiento, clock } = dependencias();
  return new CreateProductoUseCase(productos, perfiles, procesador, almacenamiento, clock, logger);
}

export function crearUpdateProducto(): UpdateProductoUseCase {
  const { productos, clock } = dependencias();
  return new UpdateProductoUseCase(productos, clock, logger);
}

export function crearDeactivateProducto(): DeactivateProductoUseCase {
  const { productos, clock } = dependencias();
  return new DeactivateProductoUseCase(productos, clock, logger);
}

export function crearReemplazarImagenProducto(): ReemplazarImagenProductoUseCase {
  const { productos, procesador, almacenamiento, clock } = dependencias();
  return new ReemplazarImagenProductoUseCase(productos, procesador, almacenamiento, clock, logger);
}
