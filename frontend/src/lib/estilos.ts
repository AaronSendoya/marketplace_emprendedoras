// Anillo de foco consistente para enlaces de texto (CLAUDE.md sección 6, regla 7: "estados de
// foco visibles"). El color es el token `--color-foco`: naranja en el sitio público (regla 14) y magenta en
// el Admin y en Mi negocio, que lo redefinen en su tema. Button/Input/Select ya traen el suyo propio; esto es para los <Link> sueltos
// (Navbar, Footer, "Ver perfil"/"Ver producto", IconLink...) que solo tenían estilos de hover.
export const CLASES_FOCO_ENLACE =
  "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2";

// El mismo anillo de foco, sin radio, para los controles que ya traen el suyo (botones cuadrados, chips): el
// `rounded-sm` de arriba chocaría con su `rounded-*` y dos radios en un elemento dependen del orden en que Tailwind
// los genera.
export const CLASES_FOCO_CONTROL = "outline-none focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2";

// Tarjetas del panel de la Emprendedora (sección 6, regla 11): borde fino y la única sombra
// permitida ahí, casi invisible. El resto del sitio sigue sin sombras. Son dos cadenas completas
// (no una base más un color suelto): dos clases `border-*` o `bg-*` en el mismo elemento dependen
// del orden en que Tailwind las genera, no del orden en que se escriben.
const BASE_TARJETA_NEGOCIO = "rounded-xl border shadow-[0_1px_2px_rgba(28,25,23,0.04)]";
export const CLASES_TARJETA_NEGOCIO = `${BASE_TARJETA_NEGOCIO} border-borde bg-superficie`;
export const CLASES_TARJETA_PROMOCIONES = `${BASE_TARJETA_NEGOCIO} border-secundario/20 bg-secundario-suave/50`;

// Chip de filtro o pestaña del panel del Admin (sección 6, regla 13): lo comparten el selector de
// período, las pestañas de un emprendimiento y los filtros de estado y de perfil, para que se vean
// y se comporten igual. El estado seleccionado va en púrpura (regla 2). 44 px de alto debajo de `lg`
// (regla 12). Cadenas completas para que Tailwind las encuentre.
export function clasesChip(activo: boolean): string {
  return `inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-1.5 font-cuerpo text-sm font-medium transition-colors lg:min-h-10 ${
    activo
      ? "border-secundario bg-secundario text-white"
      : "border-borde bg-superficie text-texto-secundario hover:border-secundario hover:text-secundario"
  } ${CLASES_FOCO_ENLACE}`;
}

// Superficie principal del panel del Admin (sección 6, regla 13, nivel 2): blanca, con borde fino y el
// radio de 12 px del tema. Solo donde agrupa de verdad; algunas secciones van directo sobre el fondo.
export const CLASES_PANEL_ADMIN = "rounded-lg border border-borde bg-superficie";

// Ancho del contenido del sitio público (sección 6, regla 14, punto j): 84 rem (1344 px) en el menú, el pie, el
// banner, el Inicio, los catálogos y los detalles, para que todo siga alineado. Cadena completa para que Tailwind la
// encuentre. El Admin y Mi negocio no la usan.
export const CONTENEDOR_PUBLICO = "max-w-[84rem]";
