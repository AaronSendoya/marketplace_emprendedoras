import { enviarJsonSinRespuesta, obtenerJsonAutenticado } from "./cliente";
import type { ItemRubroClic, ItemSerieClic, MapaCalorClics, OrdenMapaCalor, ResumenClics, TipoClic } from "./tipos";

// POST /perfiles/{id}/clics: público, sin autenticar (regla 19). El catálogo lo dispara al hacer
// clic en el WhatsApp o el Instagram de un perfil; 204 sin cuerpo.
export const registrarClic = (perfilId: string, tipo: TipoClic) => enviarJsonSinRespuesta(`/perfiles/${perfilId}/clics`, { tipo });

// Las lecturas de /admin/metricas comparten el mismo rango (regla 19): sin `desde`/`hasta`,
// el backend trae los últimos 30 días. YYYY-MM-DD, día de La Paz.
export interface RangoMetricas {
  desde?: string;
  hasta?: string;
}

// GET /admin/metricas/resumen, /serie, /por-rubro y /mapa-calor: solo Admin.
export const obtenerResumenClics = (rango: RangoMetricas = {}) =>
  obtenerJsonAutenticado<ResumenClics>("/admin/metricas/resumen", { parametros: { ...rango } });

// Las cuentas con más clics del período (`limite` de 1 a 20; con `orden`, las de más clics totales,
// de WhatsApp o de Instagram), con su evolución en el tiempo y los clics del período anterior. El
// Dashboard usa esta y no /admin/metricas/ranking, que sigue en el contrato pero ya no se consulta
// desde aquí.
export const obtenerMapaCalorClics = (limite: number | undefined, rango: RangoMetricas = {}, orden?: OrdenMapaCalor) =>
  obtenerJsonAutenticado<MapaCalorClics>("/admin/metricas/mapa-calor", { parametros: { limite, orden, ...rango } });

export const obtenerSerieClics = (rango: RangoMetricas = {}) =>
  obtenerJsonAutenticado<ItemSerieClic[]>("/admin/metricas/serie", { parametros: { ...rango } });

export const obtenerClicsPorRubro = (rango: RangoMetricas = {}) =>
  obtenerJsonAutenticado<ItemRubroClic[]>("/admin/metricas/por-rubro", { parametros: { ...rango } });
