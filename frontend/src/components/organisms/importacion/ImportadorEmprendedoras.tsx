"use client";

import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ConfirmModal } from "@/components/molecules/ConfirmModal";
import {
  analizarExcelAction,
  importarFilasAction,
  validarFilasAction,
  verificarImagenesAction,
  type FalloDeImportacion,
  type RespuestaDeImportacion,
} from "@/lib/admin/importacion-acciones";
import type { FilaAVerificarImagenes, ReferenciaCatalogo, ResultadoFilaImportacion, ValidacionFilaImportacion } from "@/lib/api/tipos";
import { CLASES_PANEL_ADMIN } from "@/lib/estilos";
import { descargarArchivo, fechaParaNombreDeArchivo, formatearTamano } from "@/lib/importacion/descarga";
import {
  aFilaEditable,
  esImportable,
  filasElegidas,
  filasPorVerificar,
  motivoSinImportar,
  reducirFilas,
  resumenDeImagenes,
  tieneEnlaceDeDrive,
  trocear,
  type FilaEditable,
} from "@/lib/importacion/filas";
import { MENSAJES_IMPORTACION } from "@/lib/importacion/mensajes";
import { csvDeCredenciales, csvPorRevisar, cuentasConContrasena, type ResultadosPorFila } from "@/lib/importacion/reportes";
import { useAvisoAlSalir } from "@/lib/importacion/useAvisoAlSalir";
import { useConexionGoogle, type EstadoConexionGoogle } from "@/lib/importacion/useConexionGoogle";
import { AlertaDeArchivo } from "./AlertaDeArchivo";
import { AvisoDeImagenes, type EstadoDeVerificacion } from "./AvisoDeImagenes";
import { BarraDeAccionImportacion } from "./BarraDeAccionImportacion";
import { GuiaDelExcel } from "./GuiaDelExcel";
import { IndicadorDePasos, type PasoImportacion } from "./IndicadorDePasos";
import { ProgresoDeImportacion, type TandaProcesada } from "./ProgresoDeImportacion";
import { ResultadoDeImportacion } from "./ResultadoDeImportacion";
import { TarjetaCuentaGoogle } from "./TarjetaCuentaGoogle";
import { VistaPreviaImportacion, type DatosDelArchivo } from "./VistaPreviaImportacion";
import { ZonaDeArchivo } from "./ZonaDeArchivo";

// Regla 22 (backend): cuántas filas admite una petición de `importar` y de `validar`.
const FILAS_POR_TANDA = 10;
// Con la cuenta de Google conectada el servidor descarga las imágenes de Drive de cada fila (varios segundos por fila): la tanda
// es la mitad de grande (regla 22).
const FILAS_POR_TANDA_CON_IMAGENES = 5;
// Cuántas filas comprueba en Drive una petición de verificación (el máximo que admite el backend).
const FILAS_POR_VERIFICACION = 25;
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
  const [fallo, setFallo] = useState<{ mensaje: string; sesionVencida: boolean; conexionVencida: boolean } | null>(null);
  const [credencialesDescargadas, setCredencialesDescargadas] = useState(false);
  const [confirmacion, setConfirmacion] = useState<"cambiar-archivo" | "importar-otro" | "importar-sin-google" | null>(null);

  // La cuenta de Google que da acceso a las imágenes de Drive (regla 22) y la comprobación de los archivos en la vista previa.
  const conexion = useConexionGoogle(alCambiarLaConexion);
  const conectada = conexion.estado.fase === "conectada";
  const [verificacion, setVerificacion] = useState<EstadoDeVerificacion>({ fase: "inactiva" });
  const [avisoDeConexion, setAvisoDeConexion] = useState<string | null>(null);
  // Cada comprobación lleva un número; una respuesta que no es de la última (otra cuenta, otro archivo) se descarta.
  const generacionDeVerificacion = useRef(0);
  // Lo último que vio la pantalla, para los manejadores que corren después de una espera (la respuesta de Google, el archivo leído).
  const ultimo = useRef({ filas, fase, conectada });
  useEffect(() => {
    ultimo.current = { filas, fase, conectada };
  });

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

  // Comprobación de las fotos y los logos en Drive (regla 22): con la cuenta conectada, por lotes y sin descargar nada. Un
  // problema de un archivo es una advertencia de su fila; solo la conexión (vencida o ausente) y la red detienen la comprobación.
  async function pedirVerificacion(lote: FilaAVerificarImagenes[]) {
    for (let intento = 0; ; intento++) {
      let respuesta;
      try {
        respuesta = await verificarImagenesAction(lote);
      } catch {
        return { ok: false, error: MENSAJES_IMPORTACION.sinConexionAlComprobarImagenes } as FalloDeImportacion;
      }
      const segundos = !respuesta.ok ? respuesta.reintentarEn : undefined;
      if (respuesta.ok || segundos === undefined || intento >= REINTENTOS_POR_LIMITE) return respuesta;
      await dormir(segundos * 1000);
    }
  }

  async function verificarImagenes(origen: readonly FilaEditable[]) {
    const porVerificar = filasPorVerificar(origen);
    const generacion = ++generacionDeVerificacion.current;
    if (porVerificar.length === 0) {
      setVerificacion({ fase: "lista" });
      return;
    }
    setVerificacion({ fase: "comprobando", hechas: 0, total: porVerificar.length });

    let hechas = 0;
    for (const lote of trocear(porVerificar, FILAS_POR_VERIFICACION)) {
      const respuesta = await pedirVerificacion(lote);
      if (generacion !== generacionDeVerificacion.current) return;

      if (!respuesta.ok) {
        if (respuesta.conexionVencida) {
          setAvisoDeConexion(respuesta.error);
          dispatch({ tipo: "imagenesSinComprobar" });
          setVerificacion({ fase: "inactiva" });
          void conexion.refrescar();
        } else {
          setVerificacion({ fase: "fallida", mensaje: respuesta.error });
        }
        return;
      }
      if (respuesta.conexion !== "ok") {
        // El servidor ya no ve la cuenta (venció o se desconectó): lo comprobado hasta ahora ya no vale.
        if (respuesta.conexion === "vencida") setAvisoDeConexion(MENSAJES_IMPORTACION.conexionVencida);
        dispatch({ tipo: "imagenesSinComprobar" });
        setVerificacion({ fase: "inactiva" });
        void conexion.refrescar();
        return;
      }
      dispatch({ tipo: "imagenesVerificadas", filas: respuesta.filas });
      hechas += lote.length;
      setVerificacion({ fase: "comprobando", hechas, total: porVerificar.length });
    }
    setVerificacion({ fase: "lista" });
  }

  // El servidor dijo algo nuevo de la conexión con Google. Sin cuenta, lo comprobado deja de valer y las imágenes quedan «sin
  // comprobar»; al conectar o cambiar de cuenta estando en la vista previa, se comprueba todo con la cuenta nueva. (Si todavía no
  // hay archivo, se comprueba al leerlo, en `alAdjuntar`.)
  function alCambiarLaConexion(anterior: EstadoConexionGoogle, nuevo: EstadoConexionGoogle) {
    const cuentaDe = (estado: EstadoConexionGoogle) => (estado.fase === "conectada" ? (estado.cuenta ?? "") : null);
    const antes = cuentaDe(anterior);
    const ahora = cuentaDe(nuevo);
    if (antes === ahora) return;

    if (ahora === null) {
      generacionDeVerificacion.current++;
      setVerificacion({ fase: "inactiva" });
      dispatch({ tipo: "imagenesSinComprobar" });
      return;
    }
    setAvisoDeConexion(null);
    if (ultimo.current.fase === "revisar") void verificarImagenes(ultimo.current.filas);
  }

  function volverAlPrincipio() {
    generacionDeVerificacion.current++;
    setVerificacion({ fase: "inactiva" });
    setAvisoDeConexion(null);
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
    // Con una cuenta conectada, la vista previa nace comprobando las fotos y los logos en Drive.
    if (ultimo.current.conectada) void verificarImagenes(analisis.filas.map(aFilaEditable));
    setArchivo({
      nombre: adjunto.name,
      hoja: analisis.hoja,
      hojas: analisis.hojas,
      ignoradas: analisis.columnas.ignoradas,
      opcionalesAusentes: analisis.columnas.opcionales_ausentes,
      obligatoriasAusentes: analisis.columnas.obligatorias_ausentes,
      desconocidas: analisis.columnas.desconocidas,
      aproximadas: analisis.columnas.aproximadas,
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
    // Con imágenes de Drive que descargar, tandas más chicas (el servidor rechaza las de más de 5 filas).
    const conImagenes = conectada && aImportar.some(tieneEnlaceDeDrive);
    const tandas = trocear(aImportar, conImagenes ? FILAS_POR_TANDA_CON_IMAGENES : FILAS_POR_TANDA);
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
        const conexionVencida = respuesta.conexionVencida === true;
        setFallo({ mensaje: respuesta.error, sesionVencida: respuesta.sesionVencida === true, conexionVencida });
        // La cookie de la conexión ya se borró en el servidor: la tarjeta se actualiza para ofrecer conectar de nuevo.
        if (conexionVencida) void conexion.refrescar();
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
  // Si la conexión venció y ya se volvió a conectar, el aviso deja de pedir que se conecte.
  const falloVisible = fallo?.conexionVencida && conectada ? { ...fallo, mensaje: MENSAJES_IMPORTACION.conexionRestablecida } : fallo;

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
  const resumenImagenes = useMemo(() => resumenDeImagenes(filas), [filas]);
  const comprobandoImagenes = verificacion.fase === "comprobando";
  const motivo = motivoSinImportar(filas) ?? (comprobandoImagenes ? "Estamos comprobando las fotos y los logos en Drive. Un momento." : null);
  const filasConEnlaceElegidas = elegidas.filter(tieneEnlaceDeDrive).length;

  // La conexión dura una hora y su cookie desaparece sola: antes de importar se vuelve a preguntar al servidor. Si había enlaces de
  // Drive y ya no hay cuenta, no se importa en silencio con las imágenes predeterminadas: se pregunta.
  async function pedirImportar() {
    if (filasConEnlaceElegidas > 0) {
      const actual = await conexion.refrescar();
      if (actual.fase !== "conectada") {
        setConfirmacion("importar-sin-google");
        return;
      }
    }
    void importar(elegidas);
  }

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
            <TarjetaCuentaGoogle conexion={conexion} avisoDeLaPantalla={conectada ? null : avisoDeConexion} />
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
          <TarjetaCuentaGoogle conexion={conexion} avisoDeLaPantalla={conectada ? null : avisoDeConexion} />
          <AvisoDeImagenes
            resumen={resumenImagenes}
            conexion={conexion.estado}
            verificacion={verificacion}
            onVolverAComprobar={() => void verificarImagenes(filas)}
          />
          <VistaPreviaImportacion archivo={archivo} filas={filas} ciudades={ciudades} rubros={rubros} dispatch={dispatch} onCambiarArchivo={pedirCambiarArchivo} />
          <BarraDeAccionImportacion cantidad={elegidas.length} motivo={motivo} conImagenes={conectada} onImportar={() => void pedirImportar()} />
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

      {fase === "resultado" && fallo?.conexionVencida && pendientes.length > 0 && <TarjetaCuentaGoogle conexion={conexion} avisoDeLaPantalla={null} />}

      {fase === "resultado" && (
        <ResultadoDeImportacion
          filas={filas}
          resultados={resultados}
          pendientes={pendientes.length}
          fallo={falloVisible}
          esperaConexion={fallo?.conexionVencida === true && !conectada}
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
        titulo={
          confirmacion === "cambiar-archivo"
            ? "¿Cambiar de archivo?"
            : confirmacion === "importar-sin-google"
              ? "No hay una cuenta de Google conectada"
              : "¿Importar otro archivo?"
        }
        descripcion={
          confirmacion === "cambiar-archivo"
            ? "Perderás los cambios que hiciste en la vista previa."
            : confirmacion === "importar-sin-google"
              ? `${filasConEnlaceElegidas} ${filasConEnlaceElegidas === 1 ? "fila trae" : "filas traen"} enlaces de Drive, pero la conexión con Google no está activa (dura una hora). Si importas ahora, esas fotos y logos quedan con la imagen predeterminada y los subes a mano después. Para cargarlos, cancela y conecta la cuenta.`
              : "Todavía no descargaste las contraseñas temporales. Se muestran una sola vez: si empiezas de nuevo, no podrás recuperarlas."
        }
        textoConfirmar={
          confirmacion === "cambiar-archivo" ? "Cambiar de archivo" : confirmacion === "importar-sin-google" ? "Importar sin imágenes" : "Empezar de nuevo"
        }
        variante={confirmacion === "importar-sin-google" ? "primario" : "peligro"}
        onCerrar={() => setConfirmacion(null)}
        onConfirmar={async () => {
          if (confirmacion === "importar-sin-google") {
            // No se espera: la importación dura minutos y el modal se cierra ya (la pantalla pasa al paso 3).
            void importar(elegidas);
            return;
          }
          volverAlPrincipio();
        }}
      />
    </div>
  );
}
