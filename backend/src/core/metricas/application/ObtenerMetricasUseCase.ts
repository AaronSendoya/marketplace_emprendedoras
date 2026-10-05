import type { IClock } from "@/shared/domain/IClock";
import type { ItemRankingClic, ItemRubroClic, ItemSerieClic, MapaCalorClics, OrdenMapaCalor, ResumenClics } from "../domain/Clic";
import type { IClicRepository } from "../domain/IClicRepository";
import { armarMapaCalor } from "../domain/MapaCalor";
import { rangoAnterior, resolverRango } from "../domain/RangoFechas";

export interface EntradaRango {
  desde?: string;
  hasta?: string;
}

// Solo Admin (regla 19), siempre agregado: nunca se expone el evento individual. Sin `desde`/
// `hasta`, el período por defecto son los últimos 30 días (resolverRango).
export class ObtenerResumenClicsUseCase {
  constructor(
    private readonly clics: Pick<IClicRepository, "resumen">,
    private readonly clock: IClock,
  ) {}

  ejecutar(entrada?: EntradaRango): Promise<ResumenClics> {
    return this.clics.resumen(resolverRango(entrada, this.clock.ahora()));
  }
}

export class ObtenerRankingClicsUseCase {
  constructor(
    private readonly clics: Pick<IClicRepository, "ranking">,
    private readonly clock: IClock,
  ) {}

  ejecutar(limite: number, entrada?: EntradaRango): Promise<ItemRankingClic[]> {
    return this.clics.ranking(limite, resolverRango(entrada, this.clock.ahora()));
  }
}

export class ObtenerSerieClicsUseCase {
  constructor(
    private readonly clics: Pick<IClicRepository, "serieDiaria">,
    private readonly clock: IClock,
  ) {}

  ejecutar(entrada?: EntradaRango): Promise<ItemSerieClic[]> {
    return this.clics.serieDiaria(resolverRango(entrada, this.clock.ahora()));
  }
}

export class ObtenerClicsPorRubroUseCase {
  constructor(
    private readonly clics: Pick<IClicRepository, "porRubro">,
    private readonly clock: IClock,
  ) {}

  ejecutar(entrada?: EntradaRango): Promise<ItemRubroClic[]> {
    return this.clics.porRubro(resolverRango(entrada, this.clock.ahora()));
  }
}

// Las cuentas más contactadas del período (por clics totales o por un solo canal, según `orden`),
// con su evolución en el tiempo (la granularidad de las columnas la decide el dominio según los días
// del período, armarMapaCalor) y sus clics del período anterior de igual duración, para la tendencia.
export class ObtenerMapaCalorClicsUseCase {
  constructor(
    private readonly clics: Pick<IClicRepository, "ranking" | "clicsDiariosPorPerfil" | "totalesPorPerfil">,
    private readonly clock: IClock,
  ) {}

  async ejecutar(limite: number, entrada?: EntradaRango, orden: OrdenMapaCalor = "total"): Promise<MapaCalorClics> {
    const rango = resolverRango(entrada, this.clock.ahora());
    const cuentas = await this.clics.ranking(limite, rango, orden);
    const perfilIds = cuentas.map((cuenta) => cuenta.perfilId);
    const [diarios, anteriores] = await Promise.all([
      this.clics.clicsDiariosPorPerfil(perfilIds, rango),
      this.clics.totalesPorPerfil(perfilIds, rangoAnterior(rango)),
    ]);
    return armarMapaCalor(rango, cuentas, diarios, anteriores, orden);
  }
}
