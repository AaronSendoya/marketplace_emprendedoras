// Productos y Promociones (CLAUDE.md sección 6, regla 14, punto l; regla 23 del backend): el orden al azar usa una semilla que la página
// inventa al entrar y conserva en la dirección. Así quien pasa de página no ve repetidos ni saltos, y entrar de nuevo (sin semilla) da otro orden.

// Lo que acepta el backend: 1 a 64 letras, números, guion o guion bajo.
const SEMILLA_VALIDA = /^[A-Za-z0-9_-]{1,64}$/;

export const esSemillaValida = (texto: string): boolean => SEMILLA_VALIDA.test(texto);

// Ocho caracteres de letras y números: de sobra para que dos visitas no coincidan.
export const crearSemilla = (): string => Math.random().toString(36).slice(2, 10).padEnd(8, "0");

// La semilla que viene en la dirección si es válida; si no, una nueva.
export const semillaDe = (valor: string): string => (esSemillaValida(valor) ? valor : crearSemilla());
