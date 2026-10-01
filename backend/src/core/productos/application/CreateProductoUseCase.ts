import { resolverPerfilDeGestion } from "@/core/perfiles/application/resolverPerfilDeGestion";
import type { IPerfilRepository } from "@/core/perfiles/domain/IPerfilRepository";
import type { Actor } from "@/shared/domain/Actor";
import type { IClock } from "@/shared/domain/IClock";
import type { IImageProcessor } from "@/shared/domain/IImageProcessor";
import type { IImageStorage } from "@/shared/domain/IImageStorage";
import type { ILogger } from "@/shared/domain/ILogger";
import { nuevaClaveImagen } from "@/shared/domain/imagenes";
import type { IProductoRepository } from "../domain/IProductoRepository";
import { validarPrecio, type Producto } from "../domain/Producto";

export interface DatosNuevoProducto {
  // Solo lo indica un Admin; una emprendedora crea productos en su perfil.
  perfilId?: string;
  nombre: string;
  descripcion?: string | null;
  precio?: number | null;
  // Por defecto el precio se muestra (regla 7).
  mostrarPrecio?: boolean;
  // La imagen es obligatoria y no tiene predeterminada (regla 7).
  imagen: Buffer;
}

export class CreateProductoUseCase {
  constructor(
    private readonly productos: IProductoRepository,
    private readonly perfiles: Pick<IPerfilRepository, "buscarPorId" | "buscarPorUsuarioId">,
    private readonly procesador: IImageProcessor,
    private readonly almacenamiento: IImageStorage,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, datos: DatosNuevoProducto): Promise<Producto> {
    const perfil = await resolverPerfilDeGestion(this.perfiles, actor, datos.perfilId);
    validarPrecio(datos.precio);

    const contenido = await this.procesador.procesar(datos.imagen, "producto");
    const imagenKey = nuevaClaveImagen("producto");
    await this.almacenamiento.guardar(imagenKey, contenido);

    try {
      const producto = await this.productos.crear({
        perfilId: perfil.id,
        nombre: datos.nombre,
        descripcion: datos.descripcion ?? null,
        precio: datos.precio ?? null,
        mostrarPrecio: datos.mostrarPrecio ?? true,
        imagenKey,
        ahora: this.clock.ahora(),
      });
      this.logger.info("producto_creado", { productoId: producto.id, perfilId: perfil.id, actorId: actor.id });
      return producto;
    } catch (error) {
      // Si falla el alta, la imagen recién subida no debe quedar huérfana.
      await this.almacenamiento.borrar(imagenKey).catch(() => undefined);
      throw error;
    }
  }
}
