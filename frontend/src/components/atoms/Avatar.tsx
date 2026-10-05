function iniciales(nombreCompleto: string): string {
  const palabras = nombreCompleto.trim().split(/\s+/);
  const primera = palabras[0]?.[0] ?? "";
  const ultima = palabras.length > 1 ? (palabras[palabras.length - 1]?.[0] ?? "") : "";
  return (primera + ultima).toUpperCase();
}

const POR_TAMANO = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-11 w-11 text-sm",
} as const;

// "neutro" por defecto; los tonos tintan el avatar con un color de marca (el menú lateral del Admin
// usa magenta, la fila de una cuenta Admin usa púrpura).
const POR_TONO = {
  neutro: "border-borde bg-fondo text-texto-secundario",
  acento: "border-transparent bg-acento-suave text-acento",
  secundario: "border-transparent bg-secundario-suave text-secundario",
} as const;

interface PropsAvatar {
  nombreCompleto: string;
  tamano?: keyof typeof POR_TAMANO;
  tono?: keyof typeof POR_TONO;
  className?: string;
}

// Iniciales generadas del nombre, sin foto real todavía (R2 sin conectar, backend/.env.local
// pendiente): ancla visualmente la columna de nombre en tablas con muchas filas cortas, en vez de
// dejarla en texto suelto.
export function Avatar({ nombreCompleto, tamano = "sm", tono = "neutro", className = "" }: PropsAvatar) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${POR_TAMANO[tamano]} shrink-0 items-center justify-center rounded-full border ${POR_TONO[tono]} font-cuerpo font-medium ${className}`.trim()}
    >
      {iniciales(nombreCompleto)}
    </span>
  );
}
