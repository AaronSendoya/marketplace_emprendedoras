import { desplazamiento, type Pagina, type ParametrosPagina } from "@/shared/domain/Paginacion";
import { ErrorValidacion } from "@/shared/domain/errors";
import type { CambiosDescuento, Descuento, NuevoDescuento } from "../domain/Descuento";
import type { IDescuentoRepository } from "../domain/IDescuentoRepository";

export const descuentoDePrueba = (parches: Partial<Descuento> = {}): Descuento => ({
  id: "descuento-1",
  perfilId: "perfil-1",
  perfilUsuarioId: "usuario-1",
  porcentaje: 15,
  fechaInicio: null,
  fechaFin: null,
  creadoEn: new Date("2026-09-01T00:00:00Z"),
  productoIds: [],
  ...parches,
});

export class DescuentoRepositoryEnMemoria implements IDescuentoRepository {
  constructor(readonly descuentos: Descuento[] = []) {}

  async crear(datos: NuevoDescuento): Promise<Descuento> {
    if (!["perfil-1", "perfil-2"].includes(datos.perfilId)) throw new ErrorValidacion("El perfil indicado no existe.");
    const descuento = descuentoDePrueba({
      id: `descuento-${this.descuentos.length + 1}`,
      perfilId: datos.perfilId,
      perfilUsuarioId: datos.perfilId === "perfil-1" ? "usuario-1" : "usuario-2",
      porcentaje: datos.porcentaje,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
      creadoEn: datos.ahora,
    });
    this.descuentos.push(descuento);
    return { ...descuento };
  }

  async buscarPorId(id: string) {
    const descuento = this.descuentos.find((d) => d.id === id);
    return descuento ? { ...descuento, productoIds: [...descuento.productoIds] } : null;
  }

  async actualizar(id: string, cambios: CambiosDescuento) {
    const descuento = this.descuentos.find((d) => d.id === id);
    if (!descuento) return;
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor !== undefined) (descuento as unknown as Record<string, unknown>)[clave] = valor;
    }
  }

  async listarPorPerfil(perfilId: string, pagina: ParametrosPagina): Promise<Pagina<Descuento>> {
    const propios = this.descuentos.filter((d) => d.perfilId === perfilId);
    return { datos: propios.slice(desplazamiento(pagina), desplazamiento(pagina) + pagina.limite), total: propios.length };
  }

  async asignar(descuentoId: string, productoIds: string[]) {
    const descuento = this.descuentos.find((d) => d.id === descuentoId)!;
    for (const id of productoIds) if (!descuento.productoIds.includes(id)) descuento.productoIds.push(id);
  }

  async quitar(descuentoId: string, productoId: string) {
    const descuento = this.descuentos.find((d) => d.id === descuentoId)!;
    descuento.productoIds = descuento.productoIds.filter((id) => id !== productoId);
  }
}
