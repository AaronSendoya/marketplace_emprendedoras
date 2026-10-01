import { z } from "zod";

export const LIMITE_POR_DEFECTO = 20;
export const LIMITE_MAXIMO = 100;
// Tope de la página: un OFFSET desmesurado no devuelve nada útil y cuesta a la base (regla 17).
export const PAGINA_MAXIMA = 100_000;

// Se rechaza (400) un límite mayor al máximo en vez de recortarlo en silencio.
// Para filtros propios: esquemaPaginacion.extend({ ciudad_id: z.uuid().optional() }).
export const esquemaPaginacion = z.object({
  pagina: z.coerce.number().int().min(1).max(PAGINA_MAXIMA).default(1),
  limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_DEFECTO),
});
