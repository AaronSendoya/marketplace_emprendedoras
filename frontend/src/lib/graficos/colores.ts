// Mismos valores que `src/app/globals.css` (CLAUDE.md sección 6). Recharts dibuja SVG con props
// directas (`stroke`, `fill`), no siempre resuelve bien `var(--color-x)` ahí, así que este es el
// único lugar con el hex repetido — si la paleta cambia, cambia acá también.
export const COLOR_ENFASIS = "#ea580c"; // naranja: WhatsApp, el mismo color que su CTA en todo el sitio
export const COLOR_SECUNDARIO = "#7c3aed"; // púrpura: Instagram
export const COLOR_TEXTO_SECUNDARIO = "#57534e"; // ejes y etiquetas de los gráficos
export const COLOR_BORDE = "#e7e5e4"; // líneas de grilla, discretas
export const COLOR_TINTA = "#1c1917"; // totales y lo más importante (sección 6, regla 13)
export const COLOR_ACENTO = "#9d174d"; // magenta: navegación y entidades
