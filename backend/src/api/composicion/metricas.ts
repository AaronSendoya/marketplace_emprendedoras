import {
  ObtenerClicsPorRubroUseCase,
  ObtenerMapaCalorClicsUseCase,
  ObtenerRankingClicsUseCase,
  ObtenerResumenClicsUseCase,
  ObtenerSerieClicsUseCase,
} from "@/core/metricas/application/ObtenerMetricasUseCase";
import { RegistrarClicUseCase } from "@/core/metricas/application/RegistrarClicUseCase";
import { MySqlClicRepository } from "@/core/metricas/infrastructure/MySqlClicRepository";
import { MySqlPerfilRepository } from "@/core/perfiles/infrastructure/MySqlPerfilRepository";
import { getMySqlClient } from "@/shared/infrastructure/MySqlClient";
import { SystemClock } from "@/shared/infrastructure/SystemClock";

// Cableado de los casos de uso de métricas: las rutas no lo repiten.
function dependencias() {
  const db = getMySqlClient();
  return {
    clics: new MySqlClicRepository(db),
    perfiles: new MySqlPerfilRepository(db),
    clock: new SystemClock(),
  };
}

export function crearRegistrarClic(): RegistrarClicUseCase {
  const { perfiles, clics, clock } = dependencias();
  return new RegistrarClicUseCase(perfiles, clics, clock);
}

export function crearObtenerResumenClics(): ObtenerResumenClicsUseCase {
  const { clics, clock } = dependencias();
  return new ObtenerResumenClicsUseCase(clics, clock);
}

export function crearObtenerRankingClics(): ObtenerRankingClicsUseCase {
  const { clics, clock } = dependencias();
  return new ObtenerRankingClicsUseCase(clics, clock);
}

export function crearObtenerSerieClics(): ObtenerSerieClicsUseCase {
  const { clics, clock } = dependencias();
  return new ObtenerSerieClicsUseCase(clics, clock);
}

export function crearObtenerClicsPorRubro(): ObtenerClicsPorRubroUseCase {
  const { clics, clock } = dependencias();
  return new ObtenerClicsPorRubroUseCase(clics, clock);
}

export function crearObtenerMapaCalorClics(): ObtenerMapaCalorClicsUseCase {
  const { clics, clock } = dependencias();
  return new ObtenerMapaCalorClicsUseCase(clics, clock);
}
