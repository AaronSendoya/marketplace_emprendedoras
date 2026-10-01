import type { Actor } from "@/shared/domain/Actor";
import { ErrorNoEncontrado, ErrorProhibido } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { IImageProcessor } from "@/shared/domain/IImageProcessor";
import type { IImageStorage } from "@/shared/domain/IImageStorage";
import type { ILogger } from "@/shared/domain/ILogger";
import { nuevaClaveImagen } from "@/shared/domain/imagenes";
import type { IProductoRepository } from "../domain/IProductoRepository";
import { puedeGestionarProducto, validarPrecio, type Producto } from "../domain/Producto";

// Carga el producto y comprueba que quien lo pide puede gestionarlo (regla 18): su dueña o un Admin.
async function productoGestionable(productos: IProductoRepository, actor: Actor, id: string, ahora: Date): Promise<Producto> {
  const producto = await productos.buscarPorId(id, ahora);
  if (!producto) throw new ErrorNoEncontrado("El producto no existe.");
  if (!puedeGestionarProducto(actor, producto)) throw new ErrorProhibido("Solo puedes gestionar tus propios productos.");
  return producto;
}

export interface DatosEdicionProducto {
  nombre?: string;
  descripcion?: string | null;
  // null quita el precio (aparece "Consultar Precio").
  precio?: number | null;
  mostrarPrecio?: boolean;
  // false desactiva; true reactiva (regla 7).
  activo?: boolean;
}

export class UpdateProductoUseCase {
  constructor(
    private readonly productos: IProductoRepository,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, id: string, datos: DatosEdicionProducto): Promise<Producto> {
    const ahora = this.clock.ahora();
    await productoGestionable(this.productos, actor, id, ahora);
    validarPrecio(datos.precio);

    await this.productos.actualizar(id, datos, ahora);
    this.logger.info("producto_actualizado", { productoId: id, actorId: actor.id });
    return (await this.productos.buscarPorId(id, ahora)) as Producto;
  }
}

// Soft delete (regla 7): el producto deja de mostrarse, pero sus datos y descuentos se conservan.
export class DeactivateProductoUseCase {
  constructor(
    private readonly productos: IProductoRepository,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, id: string): Promise<void> {
    const ahora = this.clock.ahora();
    const producto = await productoGestionable(this.productos, actor, id, ahora);
    if (!producto.activo) return;

    await this.productos.actualizar(id, { activo: false }, ahora);
    this.logger.info("producto_desactivado", { productoId: id, actorId: actor.id });
  }
}

export class ReemplazarImagenProductoUseCase {
  constructor(
    private readonly productos: IProductoRepository,
    private readonly procesador: IImageProcessor,
    private readonly almacenamiento: IImageStorage,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, id: string, imagen: Buffer): Promise<Producto> {
    const ahora = this.clock.ahora();
    const producto = await productoGestionable(this.productos, actor, id, ahora);

    const contenido = await this.procesador.procesar(imagen, "producto");
    const imagenKey = nuevaClaveImagen("producto");
    await this.almacenamiento.guardar(imagenKey, contenido);

    try {
      await this.productos.actualizar(id, { imagenKey }, ahora);
    } catch (error) {
      await this.almacenamiento.borrar(imagenKey).catch(() => undefined);
      throw error;
    }

    // La anterior se borra después de guardar el cambio, para no dejar el producto sin imagen.
    await this.almacenamiento
      .borrar(producto.imagenKey)
      .catch((error: unknown) => this.logger.warn("imagen_anterior_no_borrada", { error }));
    this.logger.info("producto_imagen_reemplazada", { productoId: id, actorId: actor.id });
    return (await this.productos.buscarPorId(id, ahora)) as Producto;
  }
}
