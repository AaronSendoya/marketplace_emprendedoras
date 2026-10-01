function iniciales(nombreCompleto: string): string {
  const palabras = nombreCompleto.trim().split(/\s+/);
  const primera = palabras[0]?.[0] ?? "";
  const ultima = palabras.length > 1 ? (palabras[palabras.length - 1]?.[0] ?? "") : "";
  return (primera + ultima).toUpperCase();
}

interface PropsAvatar {
  nombreCompleto: string;
  className?: string;
}

// Iniciales generadas del nombre, sin foto real todavía (R2 sin conectar, backend/.env.local
// pendiente): ancla visualmente la columna de nombre en tablas con muchas filas cortas, en vez de
// dejarla en texto suelto.
export function Avatar({ nombreCompleto, className = "" }: PropsAvatar) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-borde bg-fondo font-cuerpo text-xs font-medium text-texto-secundario ${className}`.trim()}
    >
      {iniciales(nombreCompleto)}
    </span>
  );
}
