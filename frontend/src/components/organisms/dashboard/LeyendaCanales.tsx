import { COLOR_ENFASIS, COLOR_SECUNDARIO, COLOR_TEXTO_SECUNDARIO } from "@/lib/graficos/colores";

interface PropsLeyendaCanales {
  // Solo cuando el gráfico dibuja de verdad la línea del período anterior: una leyenda no anuncia
  // algo que no está.
  conAnterior?: boolean;
}

// Leyenda de los dos canales del gráfico de interacción, en su propia fila sobre el gráfico (no dentro
// de él): línea del color del canal y su nombre. Con `conAnterior`, suma la muestra punteada del
// período anterior. Se reparte en varias filas en pantallas angostas en lugar de salirse del ancho.
export function LeyendaCanales({ conAnterior = false }: PropsLeyendaCanales) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 font-cuerpo text-sm font-medium text-texto">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-1 w-5 rounded-full" style={{ backgroundColor: COLOR_ENFASIS }} />
        WhatsApp
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-1 w-5 rounded-full" style={{ backgroundColor: COLOR_SECUNDARIO }} />
        Instagram
      </li>
      {conAnterior && (
        <li className="flex items-center gap-2 text-texto-secundario">
          <span aria-hidden="true" className="w-5 border-t-2 border-dashed" style={{ borderColor: COLOR_TEXTO_SECUNDARIO }} />
          Período anterior
        </li>
      )}
    </ul>
  );
}
