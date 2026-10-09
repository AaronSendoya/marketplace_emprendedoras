import { ErrorNoEncontrado, ErrorValidacion } from "@/shared/domain/errors";
import type { IClock } from "@/shared/domain/IClock";
import type { Pagina, ParametrosPagina } from "@/shared/domain/Paginacion";
import type { IPromocionRepository } from "../domain/IPromocionRepository";
import type { FiltrosPromociones, PromocionPublica } from "../domain/Promocion";

// Regla 23: las promociones públicas. Solo lectura, sin autenticación.
export class GetPromocionesUseCase {
  constructor(
    private readonly promociones: IPromocionRepository,
    private readonly clock: IClock,
  ) {}

  async ejecutar(filtros: FiltrosPromociones, pagina: ParametrosPagina): Promise<Pagina<PromocionPublica>> {
    // El orden al azar necesita una semilla: sin ella, cada página sería un orden distinto y se repetirían o se perderían elementos.
    if (filtros.orden === "aleatorio" && !filtros.semilla) {
      const mensaje = "El orden aleatorio necesita una semilla.";
      throw new ErrorValidacion(mensaje, [{ campo: "semilla", mensaje }]);
    }
    return this.promociones.listarPublicas(this.clock.ahora(), filtros, pagina);
  }
}

// Una promoción que no rige, es de una cuenta desactivada o no tiene productos activos se ve como inexistente (regla 23).
export class GetPromocionUseCase {
  constructor(
    private readonly promociones: IPromocionRepository,
    private readonly clock: IClock,
  ) {}

  async ejecutar(id: string): Promise<PromocionPublica> {
    const promocion = await this.promociones.buscarPublicaPorId(this.clock.ahora(), id);
    if (!promocion) throw new ErrorNoEncontrado("La promoción no existe.");
    return promocion;
  }
}
