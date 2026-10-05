import { creado, ok, paginado, sinContenido } from "@/api/http/respuestas";
import type {
  AsignarDescuentoAProductoUseCase,
  CreateDescuentoUseCase,
  DatosEdicionDescuento,
  DatosNuevoDescuento,
  ListMisDescuentosUseCase,
  QuitarDescuentoDeProductoUseCase,
  UpdateDescuentoUseCase,
} from "@/core/descuentos/application/DescuentoUseCases";
import type { DescuentoConEstado } from "@/core/descuentos/domain/Descuento";
import type { EstadoDescuento } from "@/core/descuentos/domain/VigenciaDescuento";
import type { Actor } from "@/shared/domain/Actor";
import type { ParametrosPagina } from "@/shared/domain/Paginacion";

export function serializarDescuento(descuento: DescuentoConEstado) {
  return {
    id: descuento.id,
    perfil_id: descuento.perfilId,
    porcentaje: descuento.porcentaje,
    fecha_inicio: descuento.fechaInicio ? descuento.fechaInicio.toISOString() : null,
    fecha_fin: descuento.fechaFin ? descuento.fechaFin.toISOString() : null,
    estado: descuento.estado,
    producto_ids: descuento.productoIds,
    creado_en: descuento.creadoEn.toISOString(),
  };
}

export async function listarMisDescuentos(
  usecase: ListMisDescuentosUseCase,
  usuarioId: string,
  pagina: ParametrosPagina,
  estado?: EstadoDescuento,
): Promise<Response> {
  const resultado = await usecase.ejecutar(usuarioId, pagina, estado);
  return paginado({ ...resultado, datos: resultado.datos.map(serializarDescuento) }, pagina);
}

export async function crearDescuento(usecase: CreateDescuentoUseCase, actor: Actor, datos: DatosNuevoDescuento): Promise<Response> {
  return creado(serializarDescuento(await usecase.ejecutar(actor, datos)));
}

export async function editarDescuento(usecase: UpdateDescuentoUseCase, actor: Actor, id: string, datos: DatosEdicionDescuento): Promise<Response> {
  return ok(serializarDescuento(await usecase.ejecutar(actor, id, datos)));
}

export async function asignarDescuento(
  usecase: AsignarDescuentoAProductoUseCase,
  actor: Actor,
  descuentoId: string,
  productoIds: string[],
): Promise<Response> {
  return ok(serializarDescuento(await usecase.ejecutar(actor, descuentoId, productoIds)));
}

export async function quitarDescuento(
  usecase: QuitarDescuentoDeProductoUseCase,
  actor: Actor,
  descuentoId: string,
  productoId: string,
): Promise<Response> {
  await usecase.ejecutar(actor, descuentoId, productoId);
  return sinContenido();
}
