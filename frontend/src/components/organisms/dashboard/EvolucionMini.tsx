interface PropsEvolucionMini {
  // Clics de cada intervalo de tiempo, en orden.
  serie: number[];
  // Texto para lectores de pantalla: qué muestra esta miniatura y su dato más importante.
  etiqueta: string;
  className?: string;
}

// Miniatura de la evolución de una cuenta en el período (sparkline, sin librería: una línea y un
// área en un SVG que se estira al ancho de su celda). Cada fila usa su propia escala vertical, así
// que muestra la forma del período —cuándo subió, cuándo bajó— y no la magnitud, que ya dicen los
// números de la tabla. Con un solo intervalo no hay forma que dibujar.
export function EvolucionMini({ serie, etiqueta, className = "" }: PropsEvolucionMini) {
  if (serie.length < 2) {
    return (
      <span className="font-cuerpo text-xs text-texto-secundario" title="El período es muy corto para mostrar una evolución">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Sin evolución que mostrar: el período es muy corto.</span>
      </span>
    );
  }

  const maximo = Math.max(...serie);
  const x = (indice: number) => (indice / (serie.length - 1)) * 100;
  // Con todo en cero, una línea plana abajo (no una diagonal inventada).
  const y = (valor: number) => (maximo === 0 ? 29 : 30 - (valor / maximo) * 26);
  const puntos = serie.map((valor, indice) => `${x(indice).toFixed(2)},${y(valor).toFixed(2)}`).join(" ");

  return (
    <svg role="img" aria-label={etiqueta} viewBox="0 0 100 32" preserveAspectRatio="none" className={`text-texto-secundario ${className}`.trim()}>
      <polygon points={`0,32 ${puntos} 100,32`} fill="currentColor" fillOpacity={0.12} />
      <polyline
        points={puntos}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
