// Regla 19: un evento anónimo por clic, nunca un dato del visitante.
export type TipoClic = "whatsapp" | "instagram";

export interface ResumenClics {
  whatsapp: number;
  instagram: number;
}

export interface ItemRankingClic {
  perfilId: string;
  nombreNegocio: string;
  whatsapp: number;
  instagram: number;
  total: number;
}

// Un punto por día, siempre completo (días sin clics vienen en 0): alimenta el gráfico de
// interacción y las sparklines de las tarjetas KPI del Dashboard.
export interface ItemSerieClic {
  fecha: string; // YYYY-MM-DD
  whatsapp: number;
  instagram: number;
}

export interface ItemRubroClic {
  rubro: string;
  total: number;
}

// Mapa de calor (regla 19): las cuentas más contactadas con sus clics por canal, su evolución en el
// tiempo y su comparación con el período anterior. El backend elige la granularidad de la
// evolución según los días del período, para que el número de columnas nunca crezca sin tope y el
// frontend solo tenga que dibujar (ver columnasDelRango).
export type GranularidadMapaCalor = "dia" | "semana" | "mes";

// Con qué se elige y se ordena el top: los clics totales o los de un solo canal.
export type OrdenMapaCalor = "total" | "whatsapp" | "instagram";

// Días de La Paz, YYYY-MM-DD, ambos inclusive y recortados al período pedido: una semana o un mes
// parciales en los extremos siguen siendo una columna, con su `inicio` y `fin` reales.
export interface ColumnaMapaCalor {
  inicio: string;
  fin: string;
}

export interface CeldaMapaCalor {
  whatsapp: number;
  instagram: number;
}

// Una celda por columna, en el mismo orden. Los totales de la fila son la suma de sus celdas, así
// que siempre cuadran entre sí. `totalAnterior` son los clics totales de la misma cuenta en el
// período inmediatamente anterior de igual duración (rangoAnterior), para calcular su tendencia.
export interface FilaMapaCalor {
  perfilId: string;
  nombreNegocio: string;
  whatsapp: number;
  instagram: number;
  total: number;
  totalAnterior: number;
  celdas: CeldaMapaCalor[];
}

export interface MapaCalorClics {
  granularidad: GranularidadMapaCalor;
  columnas: ColumnaMapaCalor[];
  filas: FilaMapaCalor[];
}

// Clics de una cuenta en un día de La Paz: lo que lee el repositorio para armar el mapa de calor.
export interface ClicDiarioPerfil {
  perfilId: string;
  fecha: string; // YYYY-MM-DD
  whatsapp: number;
  instagram: number;
}

// Clics totales (WhatsApp + Instagram) de una cuenta en un período: lo que lee el repositorio para
// la comparación con el período anterior.
export interface TotalPorPerfil {
  perfilId: string;
  total: number;
}
