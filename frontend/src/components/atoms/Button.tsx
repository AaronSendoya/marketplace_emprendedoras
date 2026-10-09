import type { ComponentPropsWithoutRef } from "react";

export type VarianteBoton = "primario" | "secundario" | "contorno" | "peligro" | "promocion" | "whatsapp" | "descuento";
export type TamanoBoton = "normal" | "compacto" | "tarjeta" | "grande" | "icono";

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium font-cuerpo transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

// El tamaño incluye relleno, tipografía y radio: son clases del mismo grupo que un `className` externo podría
// querer cambiar, y dos clases del mismo grupo en un elemento dependen del orden en que Tailwind las genera, no
// del orden en que se escriben. "normal" es el botón de siempre (Admin, Mi negocio, formularios); los demás son
// del sitio público (CLAUDE.md sección 6, regla 14): "compacto" para el pie de una tarjeta, "grande" para un
// llamado principal y "icono" para un botón cuadrado sin texto.
const POR_TAMANO: Record<TamanoBoton, string> = {
  normal: "rounded-md px-4 py-[var(--control-py,0.5rem)] text-sm",
  compacto: "h-10 rounded-lg px-3.5 text-sm",
  // El pie de las tarjetas del catálogo (regla 14): 44 px, el área táctil mínima.
  tarjeta: "h-11 rounded-lg px-4 text-sm font-semibold",
  grande: "min-h-12 rounded-lg px-6 text-base",
  icono: "h-10 w-10 rounded-lg",
};

// "primario" es naranja (CLAUDE.md sección 6, regla 2: el naranja es el color del CTA principal
// en todo el sitio); "secundario" se queda en magenta, el color de navegación/enlaces por
// defecto, porque no es la acción principal de la pantalla. "peligro" reutiliza ese mismo magenta
// en fondo sólido: ya es la señal de "cuenta desactivada" en Badge, así que confirmar una acción
// destructiva con el mismo color es coherente, en vez de inventar un color nuevo para "peligro".
const POR_VARIANTE: Record<VarianteBoton, string> = {
  primario: "bg-enfasis text-white hover:bg-enfasis-hover",
  secundario: "border border-borde bg-superficie text-texto hover:border-acento hover:text-acento",
  // Contorno neutro del sitio público (regla 14): la acción secundaria de una tarjeta (`Ver perfil`), un escalón
  // por debajo del naranja y sin teñirse de magenta al pasar el cursor.
  contorno: "border border-borde-fuerte bg-superficie text-texto hover:border-texto-secundario hover:bg-fondo",
  peligro: "bg-acento text-white hover:bg-acento-hover",
  // Tonal púrpura: la acción de la zona de promociones del panel de la Emprendedora (sección 6,
  // regla 11), un escalón por debajo del CTA naranja.
  promocion: "border border-secundario/25 bg-secundario-suave text-secundario hover:bg-secundario/10",
  // El verde de WhatsApp (regla 14, punto g), solo para el botón que lleva a WhatsApp. Letra oscura: 7,5:1 (el blanco daba 2,0:1).
  whatsapp: "bg-wa text-wa-texto font-semibold hover:brightness-95",
  // El púrpura sólido de las promociones del sitio público (regla 14, punto l): la acción de las tarjetas y las secciones de
  // descuentos. Con texto blanco da 5,7:1.
  descuento: "bg-secundario text-white hover:bg-secundario-hover",
};

// Expuesto aparte del componente para que un <a>/<Link> (ej. "Consultar precio" hacia wa.me, o
// un CTA a una ruta interna) pueda verse igual que un <button> sin necesitar un átomo
// polimórfico: cada elemento HTML mantiene sus propios atributos válidos.
export function clasesBoton(variante: VarianteBoton = "primario", className = "", tamano: TamanoBoton = "normal"): string {
  return `${BASE} ${POR_TAMANO[tamano]} ${POR_VARIANTE[variante]} ${className}`.trim();
}

interface PropsBoton extends ComponentPropsWithoutRef<"button"> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
}

export function Button({ variante = "primario", tamano = "normal", className = "", type = "button", ...props }: PropsBoton) {
  return <button type={type} className={clasesBoton(variante, className, tamano)} {...props} />;
}
