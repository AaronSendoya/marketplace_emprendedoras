import type { FilaMapaCalor } from "@/lib/api/tipos";

// Lo máximo que devuelve el backend por consulta de `mapa-calor` (regla 19, `limite`).
export const LIMITE_TOP_MENSUAL = 20;

export interface CambioEmprendimiento {
  perfil_id: string;
  nombre_negocio: string;
  clics: number;
  clicsAnterior: number;
  // clics - clicsAnterior: lo que ganó (positivo) o perdió (negativo).
  diferencia: number;
  // `null` cuando el mes anterior no tuvo clics: no existe un porcentaje honesto contra cero.
  porcentaje: number | null;
}

export interface Movimiento {
  suben: CambioEmprendimiento[];
  bajan: CambioEmprendimiento[];
}

function porNombre(a: CambioEmprendimiento, b: CambioEmprendimiento): number {
  return a.nombre_negocio.localeCompare(b.nombre_negocio, "es");
}

// Compara los clics de cada emprendimiento en dos meses. Se ordena por la diferencia en clics y no por
// porcentaje: pasar de 3 a 6 clics es +100 % y de 44 a 59 es +34 %, y ordenar por porcentaje premiaría
// las bases pequeñas. El porcentaje queda como dato secundario.
//
// Solo se compara lo que se ve. El backend devuelve las `limite` cuentas con más clics de cada mes y
// solo cuenta cuentas con clics:
//  - una cuenta ausente de una lista que NO llegó al límite tiene exactamente 0 clics ese mes;
//  - una cuenta ausente de una lista que SÍ llegó al límite podría tener clics que no se ven (quedó
//    fuera del top): no se compara, en vez de inventarle un 0.
export function calcularMovimiento(mes: FilaMapaCalor[], anterior: FilaMapaCalor[], porLista = 3, limite = LIMITE_TOP_MENSUAL): Movimiento {
  const clicsMes = new Map(mes.map((fila) => [fila.perfil_id, fila]));
  const clicsAnterior = new Map(anterior.map((fila) => [fila.perfil_id, fila]));
  const mesTruncado = mes.length >= limite;
  const anteriorTruncado = anterior.length >= limite;

  const cambios: CambioEmprendimiento[] = [];
  for (const perfilId of new Set([...clicsMes.keys(), ...clicsAnterior.keys()])) {
    const filaMes = clicsMes.get(perfilId);
    const filaAnterior = clicsAnterior.get(perfilId);
    const clics = filaMes ? filaMes.total : mesTruncado ? null : 0;
    const clicsPrevios = filaAnterior ? filaAnterior.total : anteriorTruncado ? null : 0;
    if (clics === null || clicsPrevios === null) continue;

    const diferencia = clics - clicsPrevios;
    if (diferencia === 0) continue;
    cambios.push({
      perfil_id: perfilId,
      nombre_negocio: (filaMes ?? filaAnterior)?.nombre_negocio ?? "",
      clics,
      clicsAnterior: clicsPrevios,
      diferencia,
      porcentaje: clicsPrevios > 0 ? Math.round((diferencia / clicsPrevios) * 100) : null,
    });
  }

  return {
    suben: cambios
      .filter((cambio) => cambio.diferencia > 0)
      .sort((a, b) => b.diferencia - a.diferencia || porNombre(a, b))
      .slice(0, porLista),
    bajan: cambios
      .filter((cambio) => cambio.diferencia < 0)
      .sort((a, b) => a.diferencia - b.diferencia || porNombre(a, b))
      .slice(0, porLista),
  };
}
