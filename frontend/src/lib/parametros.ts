// Qué se hace con los parámetros de la URL que llegan escritos a mano, de un enlace viejo o de un marcador.
// El backend rechaza con 400 una página que no sea un entero entre 1 y 100 000 y un id que no sea un UUID
// (reglas 17 y 20); si la página los mandaba tal cual, `?pagina=-1` o `?ciudad_id=zzz` terminaban en la
// pantalla de error. Aquí se descarta lo que el backend rechazaría, igual que ya se hace con `q` (se recorta
// a 100 caracteres) y con `estado` en el Admin: un parámetro inservible se ignora, no rompe la página.

// Calca `PAGINA_MAXIMA` de `backend/src/api/http/paginacion.ts`.
export const PAGINA_MAXIMA = 100_000;

// La página pedida: un entero entre 1 y `PAGINA_MAXIMA`; cualquier otra cosa («abc», «-1», «1.5», «1e3», un número
// desmesurado) es la primera.
export function paginaDeParametro(texto: string): number {
  if (!/^\d{1,6}$/.test(texto)) return 1;
  const pagina = Number(texto);
  return pagina >= 1 && pagina <= PAGINA_MAXIMA ? pagina : 1;
}

// Cuántas páginas hay para `total` resultados de `limite` por página. Con 0 resultados hay una (la vacía).
export function ultimaPagina(total: number, limite: number): number {
  return Math.max(1, Math.ceil(total / limite));
}

// Mismo criterio que el `z.uuid()` del backend (Zod 4): versión 1 a 8 y variante RFC 4122, más los UUID «nil» y «max».
const UUID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

export function esUuid(texto: string): boolean {
  return UUID.test(texto);
}

// Un filtro por id (`ciudad_id`, `rubro_id`): el mismo id si tiene forma de UUID y, si no, vacío, que es «sin filtro».
// Un UUID que no existe sigue llegando al backend, que responde con una lista vacía: eso es un resultado, no un error.
export function idDeParametro(texto: string): string {
  return esUuid(texto) ? texto : "";
}
