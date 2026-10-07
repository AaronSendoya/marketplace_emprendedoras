import { TrendingDown, TrendingUp } from "lucide-react";
import { Avatar } from "@/components/atoms/Avatar";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";
import type { IdentidadPerfil } from "@/lib/metricas/identidad";
import { formatearEntero } from "@/lib/metricas/mapaCalor";
import { LIMITE_TOP_MENSUAL, type CambioEmprendimiento, type Movimiento } from "@/lib/metricas/movimiento";
import { EnlaceNegocio, RubroCiudad } from "./IdentidadEmprendimiento";

interface PropsMovimientoMensual {
  movimiento: Movimiento;
  identidades: Record<string, IdentidadPerfil>;
}

function textoClics(cantidad: number): string {
  return `${cantidad} ${Math.abs(cantidad) === 1 ? "clic" : "clics"}`;
}

// "de 20 a 43 (+115%)", o "antes sin clics" cuando el mes anterior no tuvo ninguno: no hay porcentaje
// honesto contra cero.
function textoDetalle(cambio: CambioEmprendimiento): string {
  if (cambio.porcentaje === null) return "antes sin clics";
  return `de ${formatearEntero(cambio.clicsAnterior)} a ${formatearEntero(cambio.clics)} (${cambio.porcentaje > 0 ? "+" : ""}${cambio.porcentaje}%)`;
}

interface PropsLista {
  titulo: string;
  Icono: typeof TrendingUp;
  cambios: CambioEmprendimiento[];
  vacio: string;
  identidades: Record<string, IdentidadPerfil>;
}

function Lista({ titulo, Icono, cambios, vacio, identidades }: PropsLista) {
  return (
    <section className={`${CLASES_PANEL_ADMIN} px-5 pt-5 pb-2 sm:px-6`}>
      <h3 className="flex items-center gap-2 font-titulo text-lg font-bold text-texto">
        <Icono size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
        {titulo}
      </h3>
      {cambios.length === 0 ? (
        <p className="py-5 font-cuerpo text-sm text-texto-secundario">{vacio}</p>
      ) : (
        <ul className="mt-2 divide-y divide-borde">
          {cambios.map((cambio) => (
            <li key={cambio.perfil_id} className="flex items-center gap-3 py-4">
              {/* Sin avatar debajo de `sm`: a 360 px el nombre y la cifra necesitan el ancho. Se oculta el contenedor y
                  no el avatar (el átomo ya trae `inline-flex` y chocaría con `hidden`). */}
              <span className="hidden sm:inline-flex">
                <Avatar nombreCompleto={cambio.nombre_negocio} tamano="md" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-titulo text-base leading-tight font-bold text-texto">
                  <EnlaceNegocio perfilId={cambio.perfil_id} nombre={cambio.nombre_negocio} />
                </p>
                {identidades[cambio.perfil_id] && (
                  <p className="font-cuerpo text-sm text-texto-secundario">
                    <RubroCiudad identidad={identidades[cambio.perfil_id]} />
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-titulo text-xl leading-tight font-extrabold text-texto tabular-nums">
                  {cambio.diferencia > 0 ? "+" : ""}
                  {textoClics(cambio.diferencia)}
                </p>
                <p className="font-cuerpo text-sm whitespace-nowrap text-texto-secundario">{textoDetalle(cambio)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Quiénes ganaron y quiénes perdieron más clics entre dos meses calendario (`mesesParaMovimiento`). Se
// ordena por clics ganados o perdidos, no por porcentaje (ver `calcularMovimiento`). Una nota breve dice
// contra qué se compara y que solo cuenta lo que se ve.
export function MovimientoMensual({ movimiento, identidades }: PropsMovimientoMensual) {
  return (
    <div className="space-y-4">
      <div className="grid gap-5 md:grid-cols-2">
        <Lista titulo="Más clics que el mes anterior" Icono={TrendingUp} cambios={movimiento.suben} vacio="Ninguna ganó clics." identidades={identidades} />
        <Lista titulo="Menos clics que el mes anterior" Icono={TrendingDown} cambios={movimiento.bajan} vacio="Ninguna perdió clics." identidades={identidades} />
      </div>
      <p className="font-cuerpo text-sm text-texto-secundario">
        Compara solo entre las {LIMITE_TOP_MENSUAL} emprendedoras con más clics de cada mes. Se actualiza el primer día de cada mes.
      </p>
    </div>
  );
}
