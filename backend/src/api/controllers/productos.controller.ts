import { creado, ok, paginado, sinContenido } from "@/api/http/respuestas";
import type {
  GetMarketplaceUseCase,
  GetProductoMarketplaceUseCase,
  ListMisProductosUseCase,
} from "@/core/productos/application/ConsultasProducto";
import type { CreateProductoUseCase, DatosNuevoProducto } from "@/core/productos/application/CreateProductoUseCase";
import type {
  DatosEdicionProducto,
  DeactivateProductoUseCase,
  ReemplazarImagenProductoUseCase,
  UpdateProductoUseCase,
} from "@/core/productos/application/GestionProductoUseCases";
import { precioVisible, type FiltrosMarketplace, type Producto } from "@/core/productos/domain/Producto";
import type { Actor } from "@/shared/domain/Actor";
import type { ParametrosPagina } from "@/shared/domain/Paginacion";
import type { UrlImagen } from "./perfiles.controller";

// Regla 18: con el precio oculto o ausente no viajan ni el precio, ni el porcentaje, ni el precio con
// descuento; `consultar_precio` le dice al frontend que muestre "Consultar Precio" (regla 7). El
// frontend no calcula precios ni vigencia (regla 8).
export function serializarProductoPublico(producto: Producto, urlImagen: UrlImagen) {
  const visible = precioVisible(producto);
  return {
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    imagen_url: urlImagen(producto.imagenKey),
    precio: visible ? producto.precio : null,
    porcentaje: visible ? producto.porcentajeVigente : null,
    precio_con_descuento: visible ? producto.precioConDescuento : null,
    consultar_precio: !visible,
    creado_en: producto.creadoEn.toISOString(),
    perfil: {
      id: producto.perfil.id,
      nombre_negocio: producto.perfil.nombreNegocio,
      whatsapp: producto.perfil.whatsapp,
      ciudad: producto.perfil.ciudad,
      rubro: producto.perfil.rubro,
      logo_url: urlImagen(producto.perfil.logoKey),
    },
  };
}

// Lo que ve la dueña (y el Admin): el precio real, aunque esté oculto para el público.
export function serializarProductoPropio(producto: Producto, urlImagen: UrlImagen) {
  return {
    id: producto.id,
    perfil_id: producto.perfilId,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    imagen_url: urlImagen(producto.imagenKey),
    precio: producto.precio,
    mostrar_precio: producto.mostrarPrecio,
    activo: producto.activo,
    porcentaje: producto.precio === null ? null : producto.porcentajeVigente,
    precio_con_descuento: producto.precioConDescuento,
    creado_en: producto.creadoEn.toISOString(),
    actualizado_en: producto.actualizadoEn.toISOString(),
  };
}

export async function listarMarketplace(
  usecase: GetMarketplaceUseCase,
  filtros: FiltrosMarketplace,
  pagina: ParametrosPagina,
  urlImagen: UrlImagen,
): Promise<Response> {
  const resultado = await usecase.ejecutar(filtros, pagina);
  return paginado({ ...resultado, datos: resultado.datos.map((producto) => serializarProductoPublico(producto, urlImagen)) }, pagina, {
    similares: resultado.similares,
  });
}

export async function obtenerProductoMarketplace(usecase: GetProductoMarketplaceUseCase, id: string, urlImagen: UrlImagen): Promise<Response> {
  return ok(serializarProductoPublico(await usecase.ejecutar(id), urlImagen));
}

export async function listarMisProductos(
  usecase: ListMisProductosUseCase,
  usuarioId: string,
  pagina: ParametrosPagina,
  urlImagen: UrlImagen,
): Promise<Response> {
  const resultado = await usecase.ejecutar(usuarioId, pagina);
  return paginado({ ...resultado, datos: resultado.datos.map((producto) => serializarProductoPropio(producto, urlImagen)) }, pagina);
}

export async function crearProducto(usecase: CreateProductoUseCase, actor: Actor, datos: DatosNuevoProducto, urlImagen: UrlImagen): Promise<Response> {
  return creado(serializarProductoPropio(await usecase.ejecutar(actor, datos), urlImagen));
}

export async function editarProducto(
  usecase: UpdateProductoUseCase,
  actor: Actor,
  id: string,
  datos: DatosEdicionProducto,
  urlImagen: UrlImagen,
): Promise<Response> {
  return ok(serializarProductoPropio(await usecase.ejecutar(actor, id, datos), urlImagen));
}

export async function desactivarProducto(usecase: DeactivateProductoUseCase, actor: Actor, id: string): Promise<Response> {
  await usecase.ejecutar(actor, id);
  return sinContenido();
}

export async function reemplazarImagenProducto(
  usecase: ReemplazarImagenProductoUseCase,
  actor: Actor,
  id: string,
  imagen: Buffer,
  urlImagen: UrlImagen,
): Promise<Response> {
  return ok(serializarProductoPropio(await usecase.ejecutar(actor, id, imagen), urlImagen));
}
