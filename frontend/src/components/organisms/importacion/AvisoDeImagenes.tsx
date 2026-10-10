import { CircleCheck, Info, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { clasesBoton } from "@/components/atoms/Button";
import type { ResumenDeImagenes } from "@/lib/importacion/filas";
import type { EstadoConexionGoogle } from "@/lib/importacion/useConexionGoogle";

export type EstadoDeVerificacion =
  | { fase: "inactiva" }
  | { fase: "comprobando"; hechas: number; total: number }
  | { fase: "lista" }
  | { fase: "fallida"; mensaje: string };

interface PropsAviso {
  resumen: ResumenDeImagenes;
  conexion: EstadoConexionGoogle;
  verificacion: EstadoDeVerificacion;
  onVolverAComprobar: () => void;
}

const CLASES_ADVERTENCIA = "flex items-start gap-2 rounded-md border border-aviso-borde bg-aviso-suave px-3 py-2.5 font-cuerpo text-sm text-texto";
const CLASES_INFO = "flex items-start gap-2 rounded-md bg-fondo px-3 py-2.5 font-cuerpo text-sm text-texto-secundario";

const plural = (cantidad: number, singular: string, plural: string) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

// Lo que el paso 2 dice de las fotos y los logos en conjunto (regla 22): cuántos se cargarán, cuántos tienen problema y, cuando
// varios archivos fallan por falta de acceso, un solo aviso general con lo que hay que hacer. El detalle de cada fila está en la
// propia fila. Un problema nunca impide importar: esa imagen queda con la predeterminada.
export function AvisoDeImagenes({ resumen, conexion, verificacion, onVolverAComprobar }: PropsAviso) {
  if (resumen.conEnlace === 0) return null;

  const conectada = conexion.fase === "conectada";
  const cuenta = conexion.fase === "conectada" ? conexion.cuenta : null;
  const sinCuenta = conexion.fase === "desconectada" || conexion.fase === "no_disponible" || conexion.fase === "error";

  return (
    <div className="space-y-2" aria-label="Aviso sobre las fotos y los logos">
      {sinCuenta && (
        <p className={CLASES_ADVERTENCIA}>
          <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-aviso" />
          <span className="min-w-0 break-words">
            {conexion.fase === "no_disponible"
              ? `El archivo trae ${plural(resumen.conEnlace, "enlace", "enlaces")} de Drive, pero el servidor no tiene configurada la conexión con Google: ${resumen.conEnlace === 1 ? "esa imagen" : "esas imágenes"} quedarán con la predeterminada y se suben a mano desde cada emprendimiento.`
              : `El archivo trae ${plural(resumen.conEnlace, "enlace", "enlaces")} de Drive (en ${plural(resumen.filasConEnlace, "fila", "filas")}), pero no hay una cuenta de Google conectada: si importas así, quedarán con la imagen predeterminada. Conecta una cuenta arriba para cargarlas.`}
          </span>
        </p>
      )}

      {conectada && verificacion.fase === "comprobando" && (
        <p role="status" className={CLASES_INFO}>
          <LoaderCircle size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 animate-spin motion-reduce:animate-none" />
          <span>
            Comprobando las fotos y los logos en Drive… {verificacion.hechas} de {plural(verificacion.total, "fila", "filas")}.
          </span>
        </p>
      )}

      {conectada && verificacion.fase === "fallida" && (
        <div className={CLASES_ADVERTENCIA}>
          <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-aviso" />
          <div className="min-w-0 space-y-2">
            <p className="break-words">{verificacion.mensaje}</p>
            <button type="button" onClick={onVolverAComprobar} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
              <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
              Volver a comprobar
            </button>
          </div>
        </div>
      )}

      {conectada && verificacion.fase === "lista" && (
        <>
          {resumen.conProblema === 0 ? (
            <p role="status" className={CLASES_INFO}>
              <CircleCheck size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-salvia" />
              <span>
                {resumen.ok === 1 ? "La imagen de Drive se puede cargar." : `Las ${resumen.ok} imágenes de Drive se pueden cargar.`}
              </span>
            </p>
          ) : (
            <div className={CLASES_ADVERTENCIA}>
              <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-aviso" />
              <div className="min-w-0 space-y-2">
                <p className="break-words">
                  {plural(resumen.ok, "imagen", "imágenes")} de Drive {resumen.ok === 1 ? "se puede cargar" : "se pueden cargar"} y{" "}
                  {plural(resumen.conProblema, "tiene", "tienen")} un problema. Las filas con problema se importan igual, con la imagen predeterminada
                  en su lugar, y quedan en el reporte «por revisar»; esa imagen la subes a mano desde el emprendimiento.
                </p>
                {resumen.sinAcceso > 0 && (
                  <p className="break-words">
                    {plural(resumen.sinAcceso, "archivo", "archivos")} {resumen.sinAcceso === 1 ? "no es accesible" : "no son accesibles"} para{" "}
                    {cuenta ? <strong className="font-semibold break-all">{cuenta}</strong> : "la cuenta conectada"}. Comparte la carpeta de Drive con esa cuenta
                    (o conecta otra que ya tenga acceso) y pulsa «Volver a comprobar».
                  </p>
                )}
                <button type="button" onClick={onVolverAComprobar} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
                  <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
                  Volver a comprobar
                </button>
              </div>
            </div>
          )}
          {resumen.conProblema === 0 && (
            <p className="flex items-start gap-2 px-1 font-cuerpo text-xs text-texto-secundario">
              <Info size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
              Al importar, cada archivo se vuelve a descargar y comprobar: si alguno falla en ese momento, esa fila se importa con la imagen
              predeterminada y se avisa en el resultado.
            </p>
          )}
        </>
      )}
    </div>
  );
}
