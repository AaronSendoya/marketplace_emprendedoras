import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { clasesBoton } from "@/components/atoms/Button";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";

export interface TandaProcesada {
  numero: number;
  // Primera y última fila del Excel de la tanda.
  desde: number;
  hasta: number;
  creadas: number;
  omitidas: number;
  conError: number;
}

interface PropsProgreso {
  procesadas: number;
  total: number;
  tandaActual: number;
  tandasTotales: number;
  historial: readonly TandaProcesada[];
  deteniendo: boolean;
  // Segundos que se espera antes de reintentar la tanda (demasiadas peticiones), o `null`.
  espera: number | null;
  onDetener: () => void;
}

const plural = (cantidad: number, singular: string, plural: string) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

export function resumenDeTanda(tanda: TandaProcesada): string {
  const partes = [plural(tanda.creadas, "creada", "creadas")];
  if (tanda.omitidas > 0) partes.push(`${plural(tanda.omitidas, "omitida", "omitidas")} porque ya existían`);
  if (tanda.conError > 0) partes.push(plural(tanda.conError, "con error", "con error"));
  return partes.join(", ");
}

// Paso 3 (regla 22): el avance por tandas de 10 filas. El texto del avance es una región `aria-live`, así que un lector de pantalla
// lo anuncia sin que haya que buscarlo.
export function ProgresoDeImportacion({ procesadas, total, tandaActual, tandasTotales, historial, deteniendo, espera, onDetener }: PropsProgreso) {
  const porcentaje = total === 0 ? 0 : Math.round((procesadas / total) * 100);
  const pendientes = Math.max(0, tandasTotales - historial.length - 1);

  return (
    <div className={`${CLASES_PANEL_ADMIN} space-y-5 p-5 sm:p-6`}>
      <div role="status" aria-live="polite" className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-titulo text-3xl font-extrabold text-texto tabular-nums">
          {procesadas} de {total}
        </p>
        <p className="font-cuerpo text-base text-texto-secundario">{total === 1 ? "emprendedora procesada" : "emprendedoras procesadas"}</p>
      </div>

      <div
        role="progressbar"
        aria-label="Avance de la importación"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        className="h-3 overflow-hidden rounded-full bg-borde"
      >
        <div className="h-full rounded-full bg-enfasis transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${porcentaje}%` }} />
      </div>

      <ul className="max-h-72 space-y-1.5 overflow-y-auto font-cuerpo text-sm">
        {historial.map((tanda) => (
          <li key={tanda.numero} className="flex items-center gap-2.5 rounded-md bg-fondo px-3 py-2 text-texto">
            <Check size={16} strokeWidth={2.4} aria-hidden="true" className="shrink-0 text-salvia" />
            <span>
              Tanda {tanda.numero} de {tandasTotales}: filas {tanda.desde} a {tanda.hasta}, {resumenDeTanda(tanda)}
            </span>
          </li>
        ))}
        {historial.length < tandasTotales && (
          <li className="flex items-center gap-2.5 rounded-md bg-enfasis-suave px-3 py-2 text-texto">
            <LoaderCircle size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 animate-spin text-enfasis motion-reduce:animate-none" />
            <span>
              Tanda {tandaActual + 1} de {tandasTotales}:{" "}
              {espera !== null ? `esperando ${plural(espera, "segundo", "segundos")} antes de reintentar…` : deteniendo ? "terminando…" : "en curso…"}
            </span>
          </li>
        )}
        {pendientes > 0 && (
          <li className="px-3 py-1 text-texto-secundario">
            {pendientes === 1 ? "Queda 1 tanda pendiente" : `Quedan ${pendientes} tandas pendientes`}
          </li>
        )}
      </ul>

      <p className="flex items-start gap-2.5 rounded-md border border-aviso-borde bg-aviso-suave px-3 py-2.5 font-cuerpo text-sm text-aviso">
        <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
        No cierres esta pestaña. Si lo haces, la importación queda a medias; puedes repetirla y las cuentas ya creadas se omiten solas.
      </p>

      <button type="button" onClick={onDetener} disabled={deteniendo} className={clasesBoton("secundario", "min-h-11 w-full sm:w-auto lg:min-h-0")}>
        {deteniendo ? "Se detendrá al terminar esta tanda…" : "Detener después de esta tanda"}
      </button>
    </div>
  );
}
