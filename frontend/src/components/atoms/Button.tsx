import type { ComponentPropsWithoutRef } from "react";

export type VarianteBoton = "primario" | "secundario" | "peligro" | "promocion";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-[var(--control-py,0.5rem)] text-sm font-medium font-cuerpo transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

// "primario" es naranja (CLAUDE.md sección 6, regla 2: el naranja es el color del CTA principal
// en todo el sitio); "secundario" se queda en magenta, el color de navegación/enlaces por
// defecto, porque no es la acción principal de la pantalla. "peligro" reutiliza ese mismo magenta
// en fondo sólido: ya es la señal de "cuenta desactivada" en Badge, así que confirmar una acción
// destructiva con el mismo color es coherente, en vez de inventar un color nuevo para "peligro".
const POR_VARIANTE: Record<VarianteBoton, string> = {
  primario: "bg-enfasis text-white hover:bg-enfasis-hover",
  secundario: "border border-borde bg-superficie text-texto hover:border-acento hover:text-acento",
  peligro: "bg-acento text-white hover:bg-acento-hover",
  // Tonal púrpura: la acción de la zona de promociones del panel de la Emprendedora (sección 6,
  // regla 11), un escalón por debajo del CTA naranja.
  promocion: "border border-secundario/25 bg-secundario-suave text-secundario hover:bg-secundario/10",
};

// Expuesto aparte del componente para que un <a>/<Link> (ej. "Consultar precio" hacia wa.me, o
// un CTA a una ruta interna) pueda verse igual que un <button> sin necesitar un átomo
// polimórfico: cada elemento HTML mantiene sus propios atributos válidos.
export function clasesBoton(variante: VarianteBoton = "primario", className = ""): string {
  return `${BASE} ${POR_VARIANTE[variante]} ${className}`.trim();
}

interface PropsBoton extends ComponentPropsWithoutRef<"button"> {
  variante?: VarianteBoton;
}

export function Button({ variante = "primario", className = "", type = "button", ...props }: PropsBoton) {
  return <button type={type} className={clasesBoton(variante, className)} {...props} />;
}
