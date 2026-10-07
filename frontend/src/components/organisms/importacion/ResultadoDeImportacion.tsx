import { CircleCheck, CircleX, Download, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";
import type { FilaEditable } from "@/lib/importacion/filas";
import { cuentasConContrasena, filasPorRevisar, type ResultadosPorFila } from "@/lib/importacion/reportes";

interface PropsResultado {
  filas: readonly FilaEditable[];
  resultados: ResultadosPorFila;
  // Filas elegidas que no llegaron a procesarse (se detuvo la importación o se cortó la conexión).
  pendientes: number;
  // Por qué se detuvo, si no fue a pedido del Admin.
  fallo: { mensaje: string; sesionVencida: boolean } | null;
  detenida: boolean;
  credencialesDescargadas: boolean;
  onCredencialesDescargadas: (descargadas: boolean) => void;
  onDescargarCredenciales: () => void;
  onDescargarReporte: () => void;
  onReanudar: () => void;
  onNueva: () => void;
}

const plural = (cantidad: number, singular: string, plural: string) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

// Paso 4 (regla 22): qué se creó, las dos descargas (credenciales, que se ven una sola vez, y lo que conviene revisar), las filas
// con error y el siguiente paso.
export function ResultadoDeImportacion({
  filas,
  resultados,
  pendientes,
  fallo,
  detenida,
  credencialesDescargadas,
  onCredencialesDescargadas,
  onDescargarCredenciales,
  onDescargarReporte,
  onReanudar,
  onNueva,
}: PropsResultado) {
  const lista = Object.values(resultados);
  const creadas = lista.filter((resultado) => resultado.estado === "creada").length;
  const omitidas = lista.filter((resultado) => resultado.estado === "omitida").length;
  const conError = lista.filter((resultado) => resultado.estado === "error");
  const conContrasena = cuentasConContrasena(resultados);
  const porRevisar = filasPorRevisar(filas, resultados).length;

  const titulo = creadas > 0 ? `Se importaron ${plural(creadas, "emprendedora", "emprendedoras")}` : "No se creó ninguna cuenta";

  return (
    <div className="space-y-4">
      <div className={`${CLASES_PANEL_ADMIN} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6`}>
        <span aria-hidden="true" className={`flex size-14 shrink-0 items-center justify-center rounded-full ${creadas > 0 ? "bg-salvia-suave text-salvia" : "bg-fondo text-texto-secundario"}`}>
          <CircleCheck size={30} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h3 className="font-titulo text-2xl font-extrabold text-texto">{titulo}</h3>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-cuerpo text-sm text-texto-secundario">
            <li>
              <b className="font-semibold text-salvia">{creadas}</b> {creadas === 1 ? "creada" : "creadas"}
            </li>
            {omitidas > 0 && (
              <li>
                <b className="font-semibold text-texto">{omitidas}</b> {omitidas === 1 ? "omitida porque ya tenía cuenta" : "omitidas porque ya tenían cuenta"}
              </li>
            )}
            {conError.length > 0 && (
              <li>
                <b className="font-semibold text-error">{conError.length}</b> con error
              </li>
            )}
          </ul>
        </div>
      </div>

      {(pendientes > 0 || fallo) && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-aviso-borde bg-aviso-suave p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 font-cuerpo text-sm text-texto">
            <TriangleAlert size={20} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-aviso" />
            <span>
              {fallo ? fallo.mensaje : detenida ? "Detuviste la importación." : "La importación se detuvo."}{" "}
              {pendientes > 0 && `${plural(pendientes, "fila sigue pendiente", "filas siguen pendientes")}: puedes continuar y las ya creadas no se repiten.`}
            </span>
          </p>
          {pendientes > 0 &&
            (fallo?.sesionVencida ? (
              <Link href="/iniciar-sesion" className={clasesBoton("secundario", "min-h-11 shrink-0 lg:min-h-0")}>
                Iniciar sesión
              </Link>
            ) : (
              <button type="button" onClick={onReanudar} className={clasesBoton("primario", "min-h-11 shrink-0 lg:min-h-0")}>
                Continuar con {plural(pendientes, "pendiente", "pendientes")}
              </button>
            ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {conContrasena > 0 && (
          <section className="space-y-3 rounded-lg border border-aviso-borde bg-superficie p-5" aria-labelledby="titulo-credenciales">
            <h3 id="titulo-credenciales" className="font-titulo text-lg font-bold text-texto">
              Credenciales de acceso
            </h3>
            <p className="font-cuerpo text-sm text-texto-secundario">
              <b className="font-semibold text-texto">Las contraseñas temporales solo se ven ahora.</b> Descarga el archivo antes de salir y entrégalas a cada emprendedora
              (por ejemplo, por WhatsApp).
            </p>
            <button type="button" onClick={onDescargarCredenciales} className={clasesBoton("primario", "min-h-11 w-full lg:min-h-0")}>
              <Download size={16} strokeWidth={1.75} aria-hidden="true" />
              Descargar credenciales (CSV)
            </button>
            <label className="flex min-h-11 cursor-pointer items-start gap-2.5 font-cuerpo text-sm text-texto lg:min-h-0">
              <input
                type="checkbox"
                checked={credencialesDescargadas}
                onChange={(evento) => onCredencialesDescargadas(evento.target.checked)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-acento"
              />
              Ya descargué el archivo y lo guardé en un lugar seguro
            </label>
          </section>
        )}

        <section className="space-y-3 rounded-lg border border-borde bg-superficie p-5" aria-labelledby="titulo-por-revisar">
          <h3 id="titulo-por-revisar" className="font-titulo text-lg font-bold text-texto">
            Por revisar
          </h3>
          {porRevisar > 0 ? (
            <>
              <p className="font-cuerpo text-sm text-texto-secundario">
                {plural(porRevisar, "emprendedora creada tiene", "emprendedoras creadas tienen")} algo que conviene mirar: separaciones de nombre supuestas, rubros
                equivalentes dudosos y redes sociales que no se reconocieron.
              </p>
              <button type="button" onClick={onDescargarReporte} className={clasesBoton("secundario", "min-h-11 w-full lg:min-h-0")}>
                <Download size={16} strokeWidth={1.75} aria-hidden="true" />
                Descargar reporte (CSV)
              </button>
            </>
          ) : (
            <p className="font-cuerpo text-sm text-texto-secundario">Nada por revisar: no hubo suposiciones dudosas ni datos que no se guardaran.</p>
          )}
        </section>
      </div>

      {conError.length > 0 && (
        <section className={`${CLASES_PANEL_ADMIN} p-5`} aria-labelledby="titulo-errores">
          <h3 id="titulo-errores" className="font-titulo text-lg font-bold text-texto">
            Filas con error
          </h3>
          <ul className="mt-3 space-y-1.5">
            {conError.map((resultado) => (
              <li key={resultado.fila} className="flex items-start gap-2 rounded-md bg-error-suave px-3 py-2 font-cuerpo text-sm text-texto">
                <CircleX size={16} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-error" />
                <span>
                  <b className="font-semibold">Fila {resultado.fila}:</b> {resultado.mensaje ?? "No se pudo importar."}
                  {resultado.cuenta_creada && " Su contraseña temporal está en el archivo de credenciales."}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-cuerpo text-xs text-texto-secundario">
            Corrige esas filas en el Excel y vuelve a subirlo: las cuentas que ya se crearon se omiten solas.
          </p>
        </section>
      )}

      <section className={`${CLASES_PANEL_ADMIN} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="min-w-0">
          <h3 className="font-titulo text-lg font-bold text-texto">Siguiente paso: fotos y logos</h3>
          <p className="mt-1 font-cuerpo text-sm text-texto-secundario">
            Mientras tanto, cada perfil usa la imagen predeterminada. Sube la foto y el logo desde el detalle de cada emprendimiento.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
          <button type="button" onClick={onNueva} className={clasesBoton("secundario", "min-h-11 lg:min-h-0")}>
            Importar otro archivo
          </button>
          <Link href="/admin/emprendimientos" className={clasesBoton("primario", "min-h-11 lg:min-h-0")}>
            Ir a Emprendimientos
          </Link>
        </div>
      </section>
    </div>
  );
}
