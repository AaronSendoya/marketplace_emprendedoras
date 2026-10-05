import Link from "next/link";
import type { EstadoDescuento } from "@/lib/api/tipos";
import { clasesChip } from "@/lib/estilos";

export const ESTADOS_DESCUENTO: EstadoDescuento[] = ["vigente", "programado", "vencido"];

// Lo que se ve al abrir la pestaña, sin `estado` en la URL: los descuentos que rigen hoy. Para ver
// todos hay que elegir "Todos" (`estado=todos`).
export const ESTADO_DESCUENTO_POR_DEFECTO: EstadoDescuento = "vigente";
export const PARAMETRO_TODOS = "todos";

// Interpreta el `estado` de la URL: `null` es "todos" (sin filtro); un valor ausente o desconocido es
// el estado por defecto, nunca llega al backend.
export function estadoDeLaUrl(parametro: string): EstadoDescuento | null {
  if (parametro === PARAMETRO_TODOS) return null;
  return ESTADOS_DESCUENTO.includes(parametro as EstadoDescuento) ? (parametro as EstadoDescuento) : ESTADO_DESCUENTO_POR_DEFECTO;
}

// Plural, para el filtro ("Vigentes"); el singular de la etiqueta de cada tarjeta vive en Badge.
export const ETIQUETA_FILTRO_ESTADO: Record<EstadoDescuento, string> = {
  vigente: "Vigentes",
  programado: "Programados",
  vencido: "Vencidos",
};

interface PropsFiltroEstadoDescuento {
  // `null`: "Todos", sin filtro.
  estadoActivo: EstadoDescuento | null;
}

// Filtro por estado de los descuentos de un emprendimiento (regla 8). Es el mismo patrón de URL que
// las pestañas (`?vista=descuentos&estado=programado`): cada opción es un <Link>, sin JS de cliente,
// y el backend devuelve ya filtrada la lista. "Vigentes" va primero y es la opción por defecto (no
// lleva `estado` en la URL); "Todos" va segundo. El estado no es una columna de la tabla: se calcula
// al consultar con las fechas y la hora actual.
export function FiltroEstadoDescuento({ estadoActivo }: PropsFiltroEstadoDescuento) {
  const opciones: { estado: EstadoDescuento | null; etiqueta: string; href: string }[] = [
    { estado: "vigente", etiqueta: ETIQUETA_FILTRO_ESTADO.vigente, href: "?vista=descuentos" },
    { estado: null, etiqueta: "Todos", href: `?vista=descuentos&estado=${PARAMETRO_TODOS}` },
    ...(["programado", "vencido"] as const).map((estado) => ({
      estado,
      etiqueta: ETIQUETA_FILTRO_ESTADO[estado],
      href: `?vista=descuentos&estado=${estado}`,
    })),
  ];

  return (
    <nav aria-label="Filtrar los descuentos por estado" className="flex flex-wrap gap-2">
      {opciones.map(({ estado, etiqueta, href }) => {
        const activa = estado === estadoActivo;
        return (
          <Link
            key={etiqueta}
            href={href}
            aria-current={activa ? "true" : undefined}
            className={clasesChip(activa)}
          >
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
