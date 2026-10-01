// Anillo de foco consistente para enlaces de texto (CLAUDE.md sección 6, regla 7: "estados de
// foco visibles"). Button/Input/Select ya traen el suyo propio; esto es para los <Link> sueltos
// (Navbar, Footer, "Ver perfil"/"Ver producto", IconLink...) que solo tenían estilos de hover.
export const CLASES_FOCO_ENLACE =
  "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2";
