import { resolverPerfilDeGestion } from "@/core/perfiles/application/resolverPerfilDeGestion";
import type { IPerfilRepository } from "@/core/perfiles/domain/IPerfilRepository";
import type { IProductoRepository } from "@/core/productos/domain/IProductoRepository";
import type { Actor } from "@/shared/domain/Actor";
import { ErrorNoEncontrado, ErrorProhibido } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { ILogger } from "@/shared/domain/ILogger";
import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import {
  puedeGestionarDescuento,
  validarPorcentaje,
  type CambiosDescuento,
  type Descuento,
  type DescuentoConEstado,
} from "../domain/Descuento";
import type { IDescuentoRepository } from "../domain/IDescuentoRepository";
import { crearVigencia, estadoDescuento, interpretarFecha, validarRango } from "../domain/VigenciaDescuento";

const conEstado = (descuento: Descuento, ahora: Date): DescuentoConEstado => ({
  ...descuento,
  estado: estadoDescuento({ inicio: descuento.fechaInicio, fin: descuento.fechaFin }, ahora),
});

async function descuentoGestionable(descuentos: IDescuentoRepository, actor: Actor, id: string): Promise<Descuento> {
  const descuento = await descuentos.buscarPorId(id);
  if (!descuento) throw new ErrorNoEncontrado("El descuento no existe.");
  if (!puedeGestionarDescuento(actor, descuento)) throw new ErrorProhibido("Solo puedes gestionar tus propios descuentos.");
  return descuento;
}

export interface DatosNuevoDescuento {
  // Solo lo indica un Admin; una emprendedora crea descuentos en su perfil.
  perfilId?: string;
  porcentaje: number;
  // Texto tal como lo escribió la persona (ver VigenciaDescuento).
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

export class CreateDescuentoUseCase {
  constructor(
    private readonly descuentos: IDescuentoRepository,
    private readonly perfiles: Pick<IPerfilRepository, "buscarPorId" | "buscarPorUsuarioId">,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, datos: DatosNuevoDescuento): Promise<DescuentoConEstado> {
    const perfil = await resolverPerfilDeGestion(this.perfiles, actor, datos.perfilId);
    validarPorcentaje(datos.porcentaje);
    const vigencia = crearVigencia(datos);

    const ahora = this.clock.ahora();
    const descuento = await this.descuentos.crear({
      perfilId: perfil.id,
      porcentaje: datos.porcentaje,
      fechaInicio: vigencia.inicio,
      fechaFin: vigencia.fin,
      ahora,
    });
    this.logger.info("descuento_creado", { descuentoId: descuento.id, perfilId: perfil.id, actorId: actor.id });
    return conEstado(descuento, ahora);
  }
}

export interface DatosEdicionDescuento {
  porcentaje?: number;
  // `undefined` = sin cambio; `null` = quitar la fecha (regla 8).
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

// Regla 8: un descuento no se borra; se termina editando `fecha_fin`.
export class UpdateDescuentoUseCase {
  constructor(
    private readonly descuentos: IDescuentoRepository,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, id: string, datos: DatosEdicionDescuento): Promise<DescuentoConEstado> {
    const actual = await descuentoGestionable(this.descuentos, actor, id);
    if (datos.porcentaje !== undefined) validarPorcentaje(datos.porcentaje);

    const inicio = datos.fechaInicio === undefined ? actual.fechaInicio : datos.fechaInicio === null ? null : interpretarFecha(datos.fechaInicio, "inicio");
    const fin = datos.fechaFin === undefined ? actual.fechaFin : datos.fechaFin === null ? null : interpretarFecha(datos.fechaFin, "fin");
    // El rango se valida con lo que quedaría guardado, no solo con lo enviado.
    validarRango({ inicio, fin });

    const cambios: CambiosDescuento = {
      porcentaje: datos.porcentaje,
      fechaInicio: datos.fechaInicio === undefined ? undefined : inicio,
      fechaFin: datos.fechaFin === undefined ? undefined : fin,
    };
    await this.descuentos.actualizar(id, cambios);
    this.logger.info("descuento_actualizado", { descuentoId: id, actorId: actor.id });
    return conEstado((await this.descuentos.buscarPorId(id)) as Descuento, this.clock.ahora());
  }
}

// "Mis descuentos": los de su perfil con el estado calculado al consultar. Sin perfil, la lista está vacía.
export class ListMisDescuentosUseCase {
  constructor(
    private readonly descuentos: IDescuentoRepository,
    private readonly perfiles: Pick<IPerfilRepository, "buscarPorUsuarioId">,
    private readonly clock: IClock,
  ) {}

  async ejecutar(usuarioId: string, pagina: ParametrosPagina): Promise<Pagina<DescuentoConEstado>> {
    const perfil = await this.perfiles.buscarPorUsuarioId(usuarioId);
    if (!perfil) return { datos: [], total: 0 };
    const { datos, total } = await this.descuentos.listarPorPerfil(perfil.id, pagina);
    const ahora = this.clock.ahora();
    return { datos: datos.map((descuento) => conEstado(descuento, ahora)), total };
  }
}

// Regla 9: un descuento solo se aplica a productos de su mismo perfil.
export class AsignarDescuentoAProductoUseCase {
  constructor(
    private readonly descuentos: IDescuentoRepository,
    private readonly productos: Pick<IProductoRepository, "buscarPorId">,
    private readonly clock: IClock,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, descuentoId: string, productoIds: string[]): Promise<DescuentoConEstado> {
    const descuento = await descuentoGestionable(this.descuentos, actor, descuentoId);
    const ahora = this.clock.ahora();
    const unicos = [...new Set(productoIds)];

    // Se valida todo antes de asignar nada: o se asignan todos o ninguno.
    for (const productoId of unicos) {
      const producto = await this.productos.buscarPorId(productoId, ahora);
      if (!producto) throw new ErrorNoEncontrado("Uno de los productos no existe.");
      if (producto.perfilId !== descuento.perfilId) {
        throw new ErrorProhibido("Un descuento solo se puede aplicar a productos de su mismo perfil.");
      }
    }

    await this.descuentos.asignar(descuentoId, unicos);
    this.logger.info("descuento_asignado", { descuentoId, actorId: actor.id, productos: unicos.length });
    return conEstado((await this.descuentos.buscarPorId(descuentoId)) as Descuento, ahora);
  }
}

export class QuitarDescuentoDeProductoUseCase {
  constructor(
    private readonly descuentos: IDescuentoRepository,
    private readonly logger: ILogger,
  ) {}

  async ejecutar(actor: Actor, descuentoId: string, productoId: string): Promise<void> {
    await descuentoGestionable(this.descuentos, actor, descuentoId);
    await this.descuentos.quitar(descuentoId, productoId);
    this.logger.info("descuento_desasignado", { descuentoId, productoId, actorId: actor.id });
  }
}
