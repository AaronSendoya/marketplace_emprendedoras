import { obtenerJson } from "./cliente";
import type { Ciudad, Health, Rubro } from "./tipos";

// GET /catalogos/ciudades, GET /catalogos/rubros: públicos, sin paginar (regla 18, backend).
// Cambian poco (se administran con SQL), así que se cachean más tiempo que el feed.
const REVALIDAR_CATALOGOS = 300;

export const listarCiudades = () =>
  obtenerJson<Ciudad[]>("/catalogos/ciudades", { revalidarSegundos: REVALIDAR_CATALOGOS });

export const listarRubros = () =>
  obtenerJson<Rubro[]>("/catalogos/rubros", { revalidarSegundos: REVALIDAR_CATALOGOS });

// GET /health: solo para comprobar la conexión con el backend (paso 1 del plan de frontend).
export const obtenerHealth = () => obtenerJson<Health>("/health", { revalidarSegundos: false });
