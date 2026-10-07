"use client";

import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import {
  analizarExcelAction,
  importarFilasAction,
  validarFilasAction,
  type FalloDeImportacion,
  type RespuestaDeImportacion,
} from "@/lib/admin/importacion-acciones";
import type { ReferenciaCatalogo, ResultadoFilaImportacion, ValidacionFilaImportacion } from "@/lib/api/tipos";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";
import { descargarArchivo, fechaParaNombreDeArchivo, formatearTamano } from "@/lib/importacion/descarga";
import {
  esImportable,
  filasElegidas,
  motivoSinImportar,
  reducirFilas,
  trocear,
  type FilaEditable,
} from "@/lib/importacion/filas";
import { MENSAJES_IMPORTACION } from "@/lib/importacion/mensajes";
import { csvDeCredenciales, csvPorRevisar, cuentasConContrasena, type ResultadosPorFila } from "@/lib/importacion/reportes";
import { useAvisoAlSalir } from "@/lib/importacion/useAvisoAlSalir";
import { AlertaDeArchivo } from "./AlertaDeArchivo";
import { BarraDeAccionImportacion } from "./BarraDeAccionImportacion";
import { GuiaDelExcel } from "./GuiaDelExcel";
import { IndicadorDePasos, type PasoImportacion } from "./IndicadorDePasos";
import { ProgresoDeImportacion, type TandaProcesada } from "./ProgresoDeImportacion";
import { ResultadoDeImportacion } from "./ResultadoDeImportacion";
import { VistaPreviaImportacion, type DatosDelArchivo } from "./VistaPreviaImportacion";
import { ZonaDeArchivo } from "./ZonaDeArchivo";

// Regla 22 (backend): cuántas filas admite una petición de `importar` y de `validar`.
const FILAS_POR_TANDA = 10;
// Espera tras la última edición antes de pedirle al servidor que revise las filas cambiadas.
const ESPERA_DE_REVISION_MS = 600;
// Cuántas veces se reintenta una tanda rechazada por "demasiadas peticiones" antes de rendirse.
const REINTENTOS_POR_LIMITE = 3;

type Fase = "subir" | "leyendo" | "revisar" | "importando" | "resultado";

const PASO_DE_FASE: Record<Fase, PasoImportacion> = { subir: "subir", leyendo: "subir", revisar: "revisar", importando: "importar", resultado: "resultado" };
const TITULO_DE_FASE: Record<Fase, string> = {
  subir: "Paso 1 de 4: subir el archivo",
  leyendo: "Paso 1 de 4: leyendo el archivo",
  revisar: "Paso 2 de 4: revisar la vista previa",
  importando: "Paso 3 de 4: importando",
  resultado: "Paso 4 de 4: resultado",
};

interface Rechazo {
  titulo: string;
  mensaje: string;
  conGuia: boolean;
  enlaceDeSesion: boolean;
}

interface Progreso {
  total: number;
  procesadas: number;
  tandaActual: number;
  tandasTotales: number;
  historial: TandaProcesada[];
  espera: number | null;
}

const PROGRESO_INICIAL: Progreso = { total: 0, procesadas: 0, tandaActual: 0, tandasTotales: 0, historial: [], espera: null };

const dormir = (milisegundos: number) => new Promise<void>((resolver) => setTimeout(resolver, milisegundos));

interface PropsImportador {
  ciudades: readonly ReferenciaCatalogo[];
  rubros: readonly ReferenciaCatalogo[];
}

// Paso a paso de la importación de emprendedoras desde Excel (regla 22): subir, revisar, importar y ver el resultado. Es el único
// sitio que habla con el servidor; los componentes de cada paso solo dibujan. Nada de lo que pasa por aquí (el archivo, las filas,
// las contraseñas temporales) se guarda: vive en la memoria de la página y se pierde al salir.
export function ImportadorEmprendedoras({ ciudades, rubros }: PropsImportador) {
  const [fase, setFase] = useState<Fase>("subir");
  const [rechazo, setRechazo] = useState<Rechazo | null>(null);
  const [archivoLeyendo, setArchivoLeyendo] = useState<{ nombre: string; tamano: number } | null>(null);
  const [archivo, setArchivo] = useState<DatosDelArchivo | null>(null);
  const [filas, dispatch] = useReducer(reducirFilas, [] as FilaEditable[]);
  const [avisoDeRevision, setAvisoDeRevision] = useState<string | null>(null);

  const [resultados, setResultados] = useState<ResultadosPorFila>({});
  const [progreso, setProgreso] = useState<Progreso>(PROGRESO_INICIAL);
  const [deteniendo, setDeteniendo] = useState(false);
  const [detenida, setDetenida] = useState(false);
  const [fallo, setFallo] = useState<{ mensaje: string; sesionVencida: boolean } | null>(null);
  const [credencialesDescargadas, setCredencialesDescargadas] = useState(false);
  const [confirmacion, setConfirmacion] = useState<"cambiar-archivo" | "importar-otro" | null>(null);

  const detenerSolicitado = useRef(false);
  const creadasHastaAhora = useRef(0);
  const inicioRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const primeraFase = useRef(true);

  const hayContrasenas = cuentasConContrasena(resultados) > 0;
  const hayCambios = filas.some((fila) => fila.editada);
  const protegido = fase === "importando" || (fase === "revisar" && hayCambios) || (fase === "resultado" && hayContrasenas && !credencialesDescargadas);
  const salida = useAvisoAlSalir(protegido);

  // Al cambiar de paso, el nuevo paso queda a la vista y su título recibe el foco (para quien usa un lector de pantalla).
  useEffect(() => {
    if (primeraFase.current) {
      primeraFase.current = false;
      return;
    }
    inicioRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    tituloRef.current?.focus({ preventScroll: true });
  }, [fase]);

  // Revisión de lo que el Admin corrigió: espera a que deje de escribir y le pide al servidor que vuelva a validar esas filas
  // (hasta 10 por petición; si quedan más, el siguiente cambio de estado dispara otra ronda).
  useEffect(() => {
    if (fase !== "revisar") return;
    const lote = filas.filter((fila) => fila.revisando).slice(0, FILAS_POR_TANDA);
    if (lote.length === 0) return;

    const temporizador = setTimeout(async () => {
      const enviadas = lote.map((fila) => ({ fila: fila.fila, version: fila.version }));
      let respuesta: RespuestaDeImportacion<{ filas: ValidacionFilaImportacion[] }>;
      try {
        respuesta = await validarFilasAction(lote.map((fila) => ({ fila: fila.fila, datos: fila.datos })));
      } catch {
        respuesta = { ok: false, error: MENSAJES_IMPORTACION.sinConexionAlRevisar };
      }

      if (!respuesta.ok) {
        dispatch({ tipo: "revisionFallida", filas: enviadas });
        setAvisoDeRevision(respuesta.error);
        return;
      }
      setAvisoDeRevision(null);
      for (const validacion of respuesta.filas) {
        const enviada = enviadas.find((e) => e.fila === validacion.fila);
        if (enviada) dispatch({ tipo: "validada", fila: validacion.fila, version: enviada.version, validacion });
      }
    }, ESPERA_DE_REVISION_MS);

    return () => clearTimeout(temporizador);
  }, [filas, fase]);

  function volverAlPrincipio() {
    setFase("subir");
    setRechazo(null);
    setArchivo(null);
    setArchivoLeyendo(null);
    dispatch({ tipo: "cargar", filas: [] });
    setResultados({});
    setProgreso(PROGRESO_INICIAL);
    setFallo(null);
    setDetenida(false);
    setDeteniendo(false);
    setAvisoDeRevision(null);
    setCredencialesDescargadas(false);
    creadasHastaAhora.current = 0;
  }

  // Paso 1: lo que el navegador rechaza (el archivo no queda adjunto) y lo que el servidor rechaza al leerlo.
  function alRechazarEnElNavegador(mensaje: string) {
    setRechazo({ titulo: "No se pudo adjuntar este archivo", mensaje, conGuia: true, enlaceDeSesion: false });
  }

  async function alAdjuntar(adjunto: File) {
    setRechazo(null);
    setArchivoLeyendo({ nombre: adjunto.name, tamano: adjunto.size });
    setFase("leyendo");

    const envio = new FormData();
    envio.set("archivo", adjunto, adjunto.name);
    let respuesta;
    try {
      respuesta = await analizarExcelAction(envio);
    } catch {
      respuesta = { ok: false, error: MENSAJES_IMPORTACION.sinConexionAlLeer } as FalloDeImportacion;
    }

    if (!respuesta.ok) {
      setFase("subir");
      setArchivoLeyendo(null);
      setRechazo({
        titulo: respuesta.sesionVencida ? "Tu sesión venció" : "No pudimos usar este archivo",
        mensaje: respuesta.error,
        conGuia: respuesta.delArchivo === true,
        enlaceDeSesion: respuesta.sesionVencida === true,
      });
      return;
    }

    const { analisis } = respuesta;
    dispatch({ tipo: "cargar", filas: analisis.filas });
    setArchivo({
      nombre: adjunto.name,
      hoja: analisis.hoja,
      hojas: analisis.hojas,
      ignoradas: analisis.columnas.ignoradas,
      opcionalesAusentes: analisis.columnas.opcionales_ausentes,
    });
    setResultados({});
    setCredencialesDescargadas(false);
    setAvisoDeRevision(null);
    creadasHastaAhora.current = 0;
    setFase("revisar");
  }

  // Paso 3: una tanda; si el servidor pide esperar (429), se espera y se repite sola unas cuantas veces.
  async function enviarTanda(tanda: FilaEditable[]): Promise<RespuestaDeImportacion<{ resultados: ResultadoFilaImportacion[] }>> {
    for (let intento = 0; ; intento++) {
      let respuesta;
      try {
        respuesta = await importarFilasAction(tanda.map((fila) => ({ fila: fila.fila, datos: fila.datos })));
      } catch {
        return { ok: false, error: MENSAJES_IMPORTACION.sinConexion(creadasHastaAhora.current) };
      }
      if (respuesta.ok) return respuesta;
      const segundos = respuesta.reintentarEn;
      if (segundos === undefined || intento >= REINTENTOS_POR_LIMITE) return respuesta;

      setProgreso((actual) => ({ ...actual, espera: segundos }));
      await dormir(segundos * 1000);
      setProgreso((actual) => ({ ...actual, espera: null }));
    }
  }

  async function importar(aImportar: FilaEditable[]) {
    const tandas = trocear(aImportar, FILAS_POR_TANDA);
    detenerSolicitado.current = false;
    setDeteniendo(false);
    setDetenida(false);
    setFallo(null);
    setProgreso({ ...PROGRESO_INICIAL, total: aImportar.length, tandasTotales: tandas.length });
    setFase("importando");

    let procesadas = 0;
    for (let i = 0; i < tandas.length; i++) {
      if (detenerSolicitado.current) {
        setDetenida(true);
        break;
      }
      setProgreso((actual) => ({ ...actual, tandaActual: i }));

      const tanda = tandas[i];
      const respuesta = await enviarTanda(tanda);
      if (!respuesta.ok) {
        setFallo({ mensaje: respuesta.error, sesionVencida: respuesta.sesionVencida === true });
        break;
      }

      const nuevos = respuesta.resultados;
      creadasHastaAhora.current += nuevos.filter((resultado) => resultado.estado === "creada").length;
      procesadas += tanda.length;
      setResultados((actual) => ({ ...actual, ...Object.fromEntries(nuevos.map((resultado) => [resultado.fila, resultado])) }));
      setProgreso((actual) => ({
        ...actual,
        procesadas,
        historial: [
          ...actual.historial,
          {
            numero: i + 1,
            desde: Math.min(...tanda.map((fila) => fila.fila)),
            hasta: Math.max(...tanda.map((fila) => fila.fila)),
            creadas: nuevos.filter((resultado) => resultado.estado === "creada").length,
            omitidas: nuevos.filter((resultado) => resultado.estado === "omitida").length,
            conError: nuevos.filter((resultado) => resultado.estado === "error").length,
          },
        ],
      }));
    }
    setFase("resultado");
  }

  function detener() {
    detenerSolicitado.current = true;
    setDeteniendo(true);
  }

  // Las filas elegidas que todavía no tienen resultado: lo que falta si se detuvo o se cortó.
  const pendientes = filasElegidas(filas).filter((fila) => resultados[fila.fila] === undefined);

  function descargarCredenciales() {
    descargarArchivo(`credenciales-emprendedoras-${fechaParaNombreDeArchivo()}.csv`, csvDeCredenciales(filas, resultados), "text/csv;charset=utf-8");
    setCredencialesDescargadas(true);
  }

  function descargarReporte() {
    descargarArchivo(`por-revisar-${fechaParaNombreDeArchivo()}.csv`, csvPorRevisar(filas, resultados), "text/csv;charset=utf-8");
  }

  function pedirCambiarArchivo() {
    if (hayCambios) setConfirmacion("cambiar-archivo");
    else volverAlPrincipio();
  }

  function pedirImportarOtro() {
    if (hayContrasenas && !credencialesDescargadas) setConfirmacion("importar-otro");
    else volverAlPrincipio();
  }

  const elegidas = filasElegidas(filas);
  const motivo = motivoSinImportar(filas);

  const textoDeSalida = fase === "importando"
    ? "La importación sigue en curso. Si sales ahora se detiene: lo que ya se creó se conserva y puedes repetirla, porque las cuentas ya creadas se omiten solas."
    : fase === "revisar"
      ? "Si sales ahora, pierdes los cambios que hiciste en la vista previa."
      : "Todavía no descargaste las contraseñas temporales. Se muestran una sola vez: si sales ahora, no podrás recuperarlas.";

  return (
    <div className="space-y-6">
      <div ref={inicioRef} className="scroll-mt-4">
        <IndicadorDePasos actual={PASO_DE_FASE[fase]} />
      </div>
      <h2 ref={tituloRef} tabIndex={-1} className="sr-only">
        {TITULO_DE_FASE[fase]}
      </h2>

      {(fase === "subir" || fase === "leyendo") && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-4">
            {rechazo && <AlertaDeArchivo {...rechazo} />}
            {fase === "leyendo" && archivoLeyendo ? (
              <div className={`${CLASES_PANEL_ADMIN} divide-y divide-borde`}>
                <div className="flex items-center gap-3 p-4">
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md bg-salvia-suave text-salvia">
                    <FileSpreadsheet size={22} strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-cuerpo text-base font-semibold break-words text-texto">{archivoLeyendo.nombre}</p>
                    <p className="font-cuerpo text-xs text-texto-secundario">{formatearTamano(archivoLeyendo.tamano)}</p>
                  </div>
                </div>
                <div role="status" className="flex items-center gap-3 p-5">
                  <LoaderCircle size={24} strokeWidth={2} aria-hidden="true" className="shrink-0 animate-spin text-acento motion-reduce:animate-none" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-cuerpo text-base font-semibold text-texto">Leyendo tu archivo…</p>
                    <div aria-hidden="true" className="h-3 w-4/5 animate-pulse rounded bg-borde motion-reduce:animate-none" />
                    <div aria-hidden="true" className="h-3 w-3/5 animate-pulse rounded bg-borde motion-reduce:animate-none" />
                  </div>
                </div>
              </div>
            ) : (
              <ZonaDeArchivo onArchivo={alAdjuntar} onRechazo={alRechazarEnElNavegador} />
            )}
          </div>
          <GuiaDelExcel />
        </div>
      )}

      {fase === "revisar" && archivo && (
        <>
          {avisoDeRevision && (
            <p role="alert" className="rounded-md border border-aviso-borde bg-aviso-suave px-3 py-2.5 font-cuerpo text-sm text-texto">
              {avisoDeRevision}
            </p>
          )}
          <VistaPreviaImportacion archivo={archivo} filas={filas} ciudades={ciudades} rubros={rubros} dispatch={dispatch} onCambiarArchivo={pedirCambiarArchivo} />
          <BarraDeAccionImportacion cantidad={elegidas.length} motivo={motivo} onImportar={() => importar(elegidas)} />
        </>
      )}

      {fase === "importando" && (
        <ProgresoDeImportacion
          procesadas={progreso.procesadas}
          total={progreso.total}
          tandaActual={progreso.tandaActual}
          tandasTotales={progreso.tandasTotales}
          historial={progreso.historial}
          deteniendo={deteniendo}
          espera={progreso.espera}
          onDetener={detener}
        />
      )}

      {fase === "resultado" && (
        <ResultadoDeImportacion
          filas={filas}
          resultados={resultados}
          pendientes={pendientes.length}
          fallo={fallo}
          detenida={detenida}
          credencialesDescargadas={credencialesDescargadas}
          onCredencialesDescargadas={setCredencialesDescargadas}
          onDescargarCredenciales={descargarCredenciales}
          onDescargarReporte={descargarReporte}
          onReanudar={() => importar(pendientes.filter(esImportable))}
          onNueva={pedirImportarOtro}
        />
      )}

      <ConfirmModal
        abierto={salida.destinoPendiente !== null}
        titulo="¿Salir de esta pantalla?"
        descripcion={textoDeSalida}
        textoConfirmar="Salir de todos modos"
        variante="peligro"
        onCerrar={salida.cancelar}
        onConfirmar={salida.confirmar}
      />
      <ConfirmModal
        abierto={confirmacion !== null}
        titulo={confirmacion === "cambiar-archivo" ? "¿Cambiar de archivo?" : "¿Importar otro archivo?"}
        descripcion={
          confirmacion === "cambiar-archivo"
            ? "Perderás los cambios que hiciste en la vista previa."
            : "Todavía no descargaste las contraseñas temporales. Se muestran una sola vez: si empiezas de nuevo, no podrás recuperarlas."
        }
        textoConfirmar={confirmacion === "cambiar-archivo" ? "Cambiar de archivo" : "Empezar de nuevo"}
        variante="peligro"
        onCerrar={() => setConfirmacion(null)}
        onConfirmar={async () => volverAlPrincipio()}
      />
    </div>
  );
}
