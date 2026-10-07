import type { CeldaMapaCalor, GranularidadMapaCalor, OrdenMapaCalor } from "@/lib/api/tipos";

// Con qué se arma y se ordena el top de la tabla de calor (regla 19). Viven aquí, en un módulo sin
// "use client", para que la página (Server Component) los reciba como lo que son: un export de un
// módulo de cliente llegaría como una referencia, no como su valor.
export const ORDENES_MAPA_CALOR: OrdenMapaCalor[] = ["total", "whatsapp", "instagram"];
export const ORDEN_MAPA_CALOR_POR_DEFECTO: OrdenMapaCalor = "total";

// La unidad de tiempo de cada columna del mapa de calor, para los textos accesibles de las miniaturas.
export const UNIDAD_POR_GRANULARIDAD: Record<GranularidadMapaCalor, string> = { dia: "día", semana: "semana", mes: "mes" };

export const ETIQUETA_ORDEN: Record<OrdenMapaCalor, string> = {
  total: "clics totales",
  whatsapp: "clics de WhatsApp",
  instagram: "clics de Instagram",
};

// Nivel de calor de una celda: cuánto representa su valor frente al líder de su columna (el mayor
// valor de esa columna entre las filas mostradas). Los umbrales son fijos y se dicen en la leyenda,
// a diferencia de una escala que solo dice "más oscuro, más clics": el clic no tiene un "bueno" o
// "malo" absoluto, así que la referencia honesta es el líder. 0 es "sin clics", distinto de "bajo".
export type NivelCalor = 0 | 1 | 2 | 3 | 4;

export const UMBRAL_MUY_ALTO = 0.75;
export const UMBRAL_ALTO = 0.5;
export const UMBRAL_MEDIO = 0.25;

export const ETIQUETA_NIVEL: Record<NivelCalor, string> = {
  0: "Sin clics",
  1: "Bajo",
  2: "Medio",
  3: "Alto",
  4: "Muy alto",
};

export function nivelCalor(valor: number, lider: number): NivelCalor {
  if (valor <= 0 || lider <= 0) return 0;
  const fraccion = valor / lider;
  if (fraccion >= UMBRAL_MUY_ALTO) return 4;
  if (fraccion >= UMBRAL_ALTO) return 3;
  if (fraccion >= UMBRAL_MEDIO) return 2;
  return 1;
}

// Clics (WhatsApp + Instagram) de cada columna de tiempo de una fila: la evolución que dibuja la
// miniatura. Cada fila usa su propia escala: muestra la forma del período, no la magnitud (esa la
// dicen los números de la fila).
export function serieDeFila(celdas: CeldaMapaCalor[]): number[] {
  return celdas.map((celda) => celda.whatsapp + celda.instagram);
}

// Porcentaje de todos los clics del período que se llevó una cuenta. `null` si no hubo clics: no
// existe un porcentaje honesto de cero.
export function calcularCuota(total: number, totalPeriodo: number): number | null {
  if (totalPeriodo <= 0) return null;
  return (total / totalPeriodo) * 100;
}

// Como el español de CLDR: los números de cuatro cifras van sin separador ("1041", igual que las
// tarjetas de arriba) y desde cinco cifras con punto ("10.412"). Se hace a mano, sin Intl, para que
// el servidor y el navegador produzcan exactamente el mismo texto.
export function formatearEntero(valor: number): string {
  const texto = String(Math.round(valor));
  return texto.length >= 5 ? texto.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : texto;
}
