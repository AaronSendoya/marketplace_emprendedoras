import type {
  ClicDiarioPerfil,
  ItemRankingClic,
  ItemRubroClic,
  ItemSerieClic,
  OrdenMapaCalor,
  ResumenClics,
  TipoClic,
  TotalPorPerfil,
} from "./Clic";
import type { RangoFechas } from "./RangoFechas";

export interface IClicRepository {
  registrar(perfilId: string, tipo: TipoClic, ahora: Date): Promise<void>;
  // Solo cuentas activas (regla 18): un perfil desactivado no debe seguir inflando los totales
  // que ve el Admin, igual que deja de mostrarse en el catálogo. Las cuatro lecturas se acotan al
  // mismo `rango` (regla 19): el Dashboard entero refleja el período elegido, no un histórico.
  resumen(rango: RangoFechas): Promise<ResumenClics>;
  // `orden` elige con qué se arma el top (los clics totales por defecto, o los de un solo canal): el
  // Top 10 por WhatsApp son las 10 cuentas con más clics de WhatsApp, no un reordenamiento del top por total.
  ranking(limite: number, rango: RangoFechas, orden?: OrdenMapaCalor): Promise<ItemRankingClic[]>;
  serieDiaria(rango: RangoFechas): Promise<ItemSerieClic[]>;
  porRubro(rango: RangoFechas): Promise<ItemRubroClic[]>;
  // Insumo del mapa de calor: clics por cuenta y día de La Paz, solo de las cuentas indicadas (y
  // activas). Un día sin clics no devuelve fila: completar con 0 es cosa de quien arma el mapa.
  clicsDiariosPorPerfil(perfilIds: string[], rango: RangoFechas): Promise<ClicDiarioPerfil[]>;
  // Clics totales de las cuentas indicadas (y activas) en `rango`, para la tendencia contra el período
  // anterior. Una cuenta sin clics no devuelve fila.
  totalesPorPerfil(perfilIds: string[], rango: RangoFechas): Promise<TotalPorPerfil[]>;
}
