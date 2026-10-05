import type {
  ClicDiarioPerfil,
  ColumnaMapaCalor,
  FilaMapaCalor,
  GranularidadMapaCalor,
  ItemRankingClic,
  MapaCalorClics,
  OrdenMapaCalor,
  TotalPorPerfil,
} from "./Clic";
import { diasDelRango, type RangoFechas } from "./RangoFechas";

// Regla 19: hasta 45 días, una columna por día; hasta 180, una por semana; más, una por mes. Así el
// mapa nunca pasa de 45 columnas en el peor caso (45 días), ni de ~26 con semanas ni de ~25 con
// meses (el rango máximo son 2 años): cabe en una tarjeta de escritorio y se desliza en un móvil.
export const DIAS_MAXIMOS_POR_DIA = 45;
export const DIAS_MAXIMOS_POR_SEMANA = 180;

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export function elegirGranularidad(totalDias: number): GranularidadMapaCalor {
  if (totalDias <= DIAS_MAXIMOS_POR_DIA) return "dia";
  if (totalDias <= DIAS_MAXIMOS_POR_SEMANA) return "semana";
  return "mes";
}

// Identifica la columna a la que pertenece un día: el propio día, el lunes de su semana (la semana
// va de lunes a domingo) o su mes de calendario.
function claveDeColumna(dia: string, granularidad: GranularidadMapaCalor): string {
  if (granularidad === "dia") return dia;
  if (granularidad === "mes") return dia.slice(0, 7);
  const [anio, mes, numero] = dia.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, numero));
  const diasDesdeElLunes = (fecha.getUTCDay() + 6) % 7; // getUTCDay: 0 = domingo
  return new Date(fecha.getTime() - diasDesdeElLunes * UN_DIA_MS).toISOString().slice(0, 10);
}

export interface ColumnasDelRango {
  granularidad: GranularidadMapaCalor;
  columnas: ColumnaMapaCalor[];
  // Índice de la columna de cada día del período, para ubicar un clic diario en su celda.
  indicePorDia: Map<string, number>;
}

// Los días de `diasDelRango` son consecutivos, así que un cambio de clave siempre abre una columna
// nueva; la primera y la última quedan recortadas al período sin ningún caso especial.
export function columnasDelRango(rango: RangoFechas): ColumnasDelRango {
  const dias = diasDelRango(rango);
  const granularidad = elegirGranularidad(dias.length);
  const columnas: ColumnaMapaCalor[] = [];
  const indicePorDia = new Map<string, number>();
  let claveActual: string | undefined;

  for (const dia of dias) {
    const clave = claveDeColumna(dia, granularidad);
    if (clave === claveActual) {
      columnas[columnas.length - 1].fin = dia;
    } else {
      columnas.push({ inicio: dia, fin: dia });
      claveActual = clave;
    }
    indicePorDia.set(dia, columnas.length - 1);
  }

  return { granularidad, columnas, indicePorDia };
}

// Valor por el que se ordena una fila: los clics del canal elegido o los totales.
function valorDeOrden(fila: FilaMapaCalor, orden: OrdenMapaCalor): number {
  return orden === "total" ? fila.total : fila[orden];
}

// Cruza las cuentas del top con sus clics diarios y con sus clics del período anterior. Los totales
// salen de sumar las celdas (no del ranking, que se consultó aparte) para que fila y celdas nunca
// discrepen. Las filas se ordenan por el canal pedido (`orden`), después por total y, en empate, por
// nombre, para que el orden sea estable entre consultas. Una cuenta sin clics en el período
// anterior no aparece en `anteriores`: su `totalAnterior` es 0.
export function armarMapaCalor(
  rango: RangoFechas,
  cuentas: Pick<ItemRankingClic, "perfilId" | "nombreNegocio">[],
  diarios: ClicDiarioPerfil[],
  anteriores: TotalPorPerfil[] = [],
  orden: OrdenMapaCalor = "total",
): MapaCalorClics {
  const { granularidad, columnas, indicePorDia } = columnasDelRango(rango);

  const filas = new Map<string, FilaMapaCalor>(
    cuentas.map((cuenta) => [
      cuenta.perfilId,
      {
        perfilId: cuenta.perfilId,
        nombreNegocio: cuenta.nombreNegocio,
        whatsapp: 0,
        instagram: 0,
        total: 0,
        totalAnterior: 0,
        celdas: columnas.map(() => ({ whatsapp: 0, instagram: 0 })),
      },
    ]),
  );

  for (const clic of diarios) {
    const fila = filas.get(clic.perfilId);
    const indice = indicePorDia.get(clic.fecha);
    if (!fila || indice === undefined) continue;
    fila.celdas[indice].whatsapp += clic.whatsapp;
    fila.celdas[indice].instagram += clic.instagram;
    fila.whatsapp += clic.whatsapp;
    fila.instagram += clic.instagram;
    fila.total += clic.whatsapp + clic.instagram;
  }

  for (const anterior of anteriores) {
    const fila = filas.get(anterior.perfilId);
    if (fila) fila.totalAnterior = anterior.total;
  }

  const ordenadas = [...filas.values()].sort(
    (a, b) => valorDeOrden(b, orden) - valorDeOrden(a, orden) || b.total - a.total || a.nombreNegocio.localeCompare(b.nombreNegocio, "es"),
  );
  return { granularidad, columnas, filas: ordenadas };
}
