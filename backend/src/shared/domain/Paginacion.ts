export interface ParametrosPagina {
  pagina: number;
  limite: number;
}

export interface Pagina<T> {
  datos: T[];
  total: number;
}

// Filas a saltar (OFFSET) para la página pedida; la primera página es la 1.
export const desplazamiento = ({ pagina, limite }: ParametrosPagina) => (pagina - 1) * limite;
