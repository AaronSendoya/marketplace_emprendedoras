import type {
  AvisoImportacion,
  DatosFilaImportacion,
  EstadoFilaImportacion,
  FilaAnalizadaImportacion,
  FilaAVerificarImagenes,
  FilaImagenesVerificadas,
  ResultadoFilaImportacion,
  ValidacionFilaImportacion,
} from "@/lib/api/tipos";

// Regla 22: el estado de la vista previa de la importación. Todo son funciones puras para que la pantalla solo las conecte con
// React (`useReducer`) y se puedan probar sin navegador. El servidor es quien manda: aquí solo se acomoda lo que dice.

// Los datos que el Admin puede corregir en la vista previa.
export type CampoEditable =
  | "nombres"
  | "apellido_paterno"
  | "apellido_materno"
  | "correo"
  | "whatsapp"
  | "ciudad_id"
  | "rubro_id"
  | "instagram"
  | "nombre_negocio"
  | "descripcion";

export interface FilaEditable {
  // Número de fila en el Excel: la identifica en todo.
  fila: number;
  oculta: boolean;
  estado: EstadoFilaImportacion;
  datos: DatosFilaImportacion;
  // Lo que se muestra debajo de la fila: las suposiciones del análisis que siguen vigentes más lo que dice la validación.
  avisos: AvisoImportacion[];
  textos: { instagram: string; otra_red: string };
  elegida: boolean;
  // El Admin cambió algo en esta fila.
  editada: boolean;
  // Hay un cambio que el servidor todavía no revisó.
  revisando: boolean;
  // Sube con cada edición: una respuesta del servidor que no es de la última edición se descarta.
  version: number;
  // La comprobación en Drive (con la cuenta de Google conectada) dijo que ese archivo se puede cargar. Sin comprobar, `false`.
  imagenesComprobadas: Record<CampoDeImagen, boolean>;
}

// La foto de perfil y el logo de una fila: dos archivos de Drive independientes (regla 22).
export type CampoDeImagen = "foto" | "logo";
export const CAMPOS_DE_IMAGEN: readonly CampoDeImagen[] = ["foto", "logo"];

// Qué se sabe de la imagen de una fila: `sin_imagen` (la fila no trae enlace), `ok` (Drive confirmó que se puede cargar),
// `problema` (hay un aviso que dice por qué no) y `sin_comprobar` (trae enlace y todavía no se comprobó).
export type EstadoDeImagen = "sin_imagen" | "ok" | "problema" | "sin_comprobar";

export type FiltroDeFilas = "todas" | "lista" | "revisar" | "error" | "omitidas" | "ocultas";

export const esImportable = (fila: Pick<FilaEditable, "estado">) => fila.estado === "lista" || fila.estado === "revisar";

// Las filas que se omiten (ya tienen cuenta o repiten un correo) no se editan: no se van a importar.
export const esEditable = (fila: Pick<FilaEditable, "estado">) => fila.estado !== "ya_existe" && fila.estado !== "repetida";

export function aFilaEditable(fila: FilaAnalizadaImportacion): FilaEditable {
  const importable = fila.estado === "lista" || fila.estado === "revisar";
  return {
    fila: fila.fila,
    oculta: fila.oculta,
    estado: fila.estado,
    datos: fila.datos,
    avisos: fila.avisos,
    textos: fila.textos,
    // Las ocultas por un filtro del Excel quedan sin marcar: el Admin decide (regla 22).
    elegida: importable && !fila.oculta,
    editada: false,
    revisando: false,
    version: 0,
    imagenesComprobadas: { foto: false, logo: false },
  };
}

// Qué avisos (por su `campo`, tal como los manda el backend) dependen de cada dato editable: al editarlo, esas suposiciones y
// errores ya no valen y se retiran hasta que el servidor vuelva a revisar.
const AVISOS_DE_CAMPO: Record<CampoEditable, readonly string[]> = {
  nombres: ["nombres", "apellido_paterno", "apellido_materno"],
  apellido_paterno: ["nombres", "apellido_paterno", "apellido_materno"],
  apellido_materno: ["nombres", "apellido_paterno", "apellido_materno"],
  correo: ["correo"],
  whatsapp: ["whatsapp"],
  ciudad_id: ["ciudad"],
  rubro_id: ["rubro"],
  instagram: ["instagram", "otra_red_social"],
  nombre_negocio: ["nombre_negocio"],
  descripcion: ["descripcion"],
};

export const avisosDe = (fila: Pick<FilaEditable, "avisos">, campo: CampoEditable) =>
  fila.avisos.filter((aviso) => AVISOS_DE_CAMPO[campo].includes(aviso.campo));

// El aviso más grave de un dato, para resaltar su celda. `info` no resalta: solo informa.
export function severidadDeCampo(fila: Pick<FilaEditable, "avisos">, campo: CampoEditable): "error" | "revisar" | null {
  const avisos = avisosDe(fila, campo);
  if (avisos.some((aviso) => aviso.severidad === "error")) return "error";
  return avisos.some((aviso) => aviso.severidad === "revisar") ? "revisar" : null;
}

export function estadoDeAvisos(avisos: readonly AvisoImportacion[]): "lista" | "revisar" | "error" {
  if (avisos.some((aviso) => aviso.severidad === "error")) return "error";
  return avisos.some((aviso) => aviso.severidad === "revisar") ? "revisar" : "lista";
}

const ORDEN = { error: 0, revisar: 1, info: 2 } as const;
const ordenar = (avisos: AvisoImportacion[]) => [...avisos].sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);

// El Admin cambia un dato: se retiran los avisos de ese dato y la fila queda pendiente de revisión. Una fila que no se puede
// importar (ya existe, repetida) no se edita.
export function editarCampo(fila: FilaEditable, campo: CampoEditable, valor: string): FilaEditable {
  if (!esEditable(fila) || fila.datos[campo] === valor) return fila;
  return {
    ...fila,
    datos: { ...fila.datos, [campo]: valor },
    avisos: fila.avisos.filter((aviso) => !AVISOS_DE_CAMPO[campo].includes(aviso.campo)),
    editada: true,
    revisando: true,
    version: fila.version + 1,
  };
}

// Lo que el servidor contestó a `validar`: solo trae errores (y "ya tiene cuenta"). Las suposiciones ("para revisar") de los
// datos que no se tocaron siguen donde estaban. Se descarta si la fila se volvió a editar mientras tanto.
export function aplicarValidacion(fila: FilaEditable, version: number, validacion: ValidacionFilaImportacion): FilaEditable {
  if (fila.version !== version) return fila;

  const conservados = fila.avisos.filter((aviso) => aviso.severidad !== "error" && aviso.codigo !== "correo_existente");
  const avisos = ordenar([...conservados, ...validacion.avisos]);
  const estado: EstadoFilaImportacion = validacion.estado === "ya_existe" ? "ya_existe" : estadoDeAvisos(avisos);
  const importable = estado === "lista" || estado === "revisar";
  const eraImportable = esImportable(fila);

  return {
    ...fila,
    estado,
    avisos,
    revisando: false,
    // Una fila con error que el Admin acaba de corregir se marca sola; una que dejó de poder importarse, se desmarca.
    elegida: importable ? (eraImportable ? fila.elegida : true) : false,
  };
}

// --- Imágenes de Drive (regla 22) ---------------------------------------------------------------------------------------------

export const idDeDrive = (fila: Pick<FilaEditable, "datos">, campo: CampoDeImagen): string =>
  campo === "foto" ? fila.datos.foto_drive_id : fila.datos.logo_drive_id;

// Un aviso de la imagen de la fila (`campo` «foto» o «logo», tal como lo manda el backend): del análisis (el enlace no sirve) o de
// la comprobación en Drive.
const avisosDeImagen = (avisos: readonly AvisoImportacion[], campo: CampoDeImagen) => avisos.filter((aviso) => aviso.campo === campo);

export function estadoDeImagen(fila: Pick<FilaEditable, "avisos" | "datos" | "imagenesComprobadas">, campo: CampoDeImagen): EstadoDeImagen {
  if (avisosDeImagen(fila.avisos, campo).length > 0) return "problema";
  if (!idDeDrive(fila, campo)) return "sin_imagen";
  return fila.imagenesComprobadas[campo] ? "ok" : "sin_comprobar";
}

// Los avisos que pone la comprobación en Drive (y que se retiran al volver a comprobar). Los del análisis (`*_enlace_invalido`,
// `*_es_carpeta`) vienen del texto del Excel y no cambian.
const SUFIJOS_DE_COMPROBACION = ["sin_acceso", "no_es_imagen", "muy_grande", "no_se_comprobo"] as const;

export const esAvisoDeComprobacion = (aviso: AvisoImportacion) =>
  CAMPOS_DE_IMAGEN.some((campo) => aviso.campo === campo && SUFIJOS_DE_COMPROBACION.some((sufijo) => aviso.codigo === `${campo}_${sufijo}`));

const esAvisoDeImagen = (aviso: AvisoImportacion) => CAMPOS_DE_IMAGEN.some((campo) => aviso.campo === campo);

// Lo que el reporte «por revisar» dice de una fila creada: lo que supuso el análisis (con el enlace de imagen que no servía) y, de
// las imágenes, lo que pasó de verdad al importar. La comprobación de la vista previa no se da por buena: el servidor volvió a
// descargar cada archivo y su respuesta es la que vale (una imagen que fallaba en la vista previa puede haberse cargado, o al
// revés). Solo entra lo que conviene mirar: una suposición dudosa (`revisar`) o un dato del Excel que no se guardó tal cual (`reporte`).
export function avisosDelReporte(fila: Pick<FilaEditable, "avisos">, resultado: Pick<ResultadoFilaImportacion, "avisos">): AvisoImportacion[] {
  const dePrevia = fila.avisos.filter((aviso) => !esAvisoDeComprobacion(aviso));
  const alImportar = resultado.avisos.filter((aviso) => esAvisoDeImagen(aviso) && !dePrevia.some((previo) => previo.codigo === aviso.codigo));
  return [...dePrevia, ...alImportar].filter((aviso) => aviso.severidad === "revisar" || aviso.reporte);
}

// Una fila que no se importa (ya tiene cuenta, o repite un correo) no carga imágenes: no se comprueba ni cuenta en los totales.
const cuentaParaImagenes = (fila: FilaEditable) => esEditable(fila);

export const tieneEnlaceDeDrive = (fila: Pick<FilaEditable, "datos">) => CAMPOS_DE_IMAGEN.some((campo) => idDeDrive(fila, campo) !== "");

// Las filas que la comprobación en Drive tiene que mirar: las que no se omiten y traen al menos un enlace.
export function filasPorVerificar(filas: readonly FilaEditable[]): FilaAVerificarImagenes[] {
  return filas
    .filter((fila) => cuentaParaImagenes(fila) && tieneEnlaceDeDrive(fila))
    .map((fila) => ({ fila: fila.fila, foto_drive_id: fila.datos.foto_drive_id, logo_drive_id: fila.datos.logo_drive_id }));
}

function conAvisosDeImagen(fila: FilaEditable, avisosNuevos: AvisoImportacion[], comprobadas: Record<CampoDeImagen, boolean>): FilaEditable {
  const avisos = ordenar([...fila.avisos.filter((aviso) => !esAvisoDeComprobacion(aviso)), ...avisosNuevos]);
  return { ...fila, avisos, estado: estadoDeAvisos(avisos), imagenesComprobadas: comprobadas };
}

// Lo que Drive contestó para una fila: sus problemas pasan a ser advertencias de la fila (la dejan «Para revisar», nunca «Con error»)
// y lo que está bien queda marcado. Una fila omitida no cambia.
export function aplicarImagenesVerificadas(fila: FilaEditable, verificacion: FilaImagenesVerificadas): FilaEditable {
  if (!cuentaParaImagenes(fila)) return fila;
  const imagenes = { foto: verificacion.foto, logo: verificacion.logo };
  const nuevos = CAMPOS_DE_IMAGEN.flatMap((campo) => {
    const { estado, aviso } = imagenes[campo];
    return estado === "problema" && aviso ? [aviso] : [];
  });
  return conAvisosDeImagen(fila, nuevos, { foto: imagenes.foto.estado === "ok", logo: imagenes.logo.estado === "ok" });
}

// Se desconectó la cuenta (o venció): lo que se había comprobado ya no vale y vuelve a «sin comprobar».
export function olvidarComprobacionDeImagenes(fila: FilaEditable): FilaEditable {
  if (!cuentaParaImagenes(fila)) return fila;
  if (!fila.imagenesComprobadas.foto && !fila.imagenesComprobadas.logo && !fila.avisos.some(esAvisoDeComprobacion)) return fila;
  return conAvisosDeImagen(fila, [], { foto: false, logo: false });
}

export interface ResumenDeImagenes {
  // Filas que se importan y traen al menos un enlace de Drive.
  filasConEnlace: number;
  // Imágenes (fotos y logos) con enlace de Drive.
  conEnlace: number;
  ok: number;
  sinComprobar: number;
  // Con un aviso (enlace que no sirve, sin acceso, no es una imagen, pesa demasiado...). Se importan igual, con la predeterminada.
  conProblema: number;
  sinAcceso: number;
}

export function resumenDeImagenes(filas: readonly FilaEditable[]): ResumenDeImagenes {
  const resumen: ResumenDeImagenes = { filasConEnlace: 0, conEnlace: 0, ok: 0, sinComprobar: 0, conProblema: 0, sinAcceso: 0 };
  for (const fila of filas) {
    if (!cuentaParaImagenes(fila)) continue;
    let conEnlaceEnFila = false;
    for (const campo of CAMPOS_DE_IMAGEN) {
      const estado = estadoDeImagen(fila, campo);
      if (estado === "sin_imagen") continue;
      conEnlaceEnFila = true;
      resumen.conEnlace++;
      if (estado === "ok") resumen.ok++;
      else if (estado === "sin_comprobar") resumen.sinComprobar++;
      else resumen.conProblema++;
      if (avisosDeImagen(fila.avisos, campo).some((aviso) => aviso.codigo === `${campo}_sin_acceso`)) resumen.sinAcceso++;
    }
    if (conEnlaceEnFila) resumen.filasConEnlace++;
  }
  return resumen;
}

export interface ResumenDeFilas {
  total: number;
  listas: number;
  revisar: number;
  conError: number;
  omitidas: number;
  ocultas: number;
}

export function resumenDe(filas: readonly FilaEditable[]): ResumenDeFilas {
  const contar = (condicion: (fila: FilaEditable) => boolean) => filas.filter(condicion).length;
  return {
    total: filas.length,
    listas: contar((fila) => fila.estado === "lista"),
    revisar: contar((fila) => fila.estado === "revisar"),
    conError: contar((fila) => fila.estado === "error"),
    omitidas: contar((fila) => fila.estado === "ya_existe" || fila.estado === "repetida"),
    ocultas: contar((fila) => fila.oculta),
  };
}

export function pasaElFiltro(fila: FilaEditable, filtro: FiltroDeFilas): boolean {
  switch (filtro) {
    case "todas":
      return true;
    case "omitidas":
      return fila.estado === "ya_existe" || fila.estado === "repetida";
    case "ocultas":
      return fila.oculta;
    default:
      return fila.estado === filtro;
  }
}

export const filasElegidas = (filas: readonly FilaEditable[]) => filas.filter((fila) => fila.elegida && esImportable(fila));

// Por qué el botón de importar está desactivado (o `null` si no lo está): la barra de acción lo dice en palabras.
export function motivoSinImportar(filas: readonly FilaEditable[]): string | null {
  if (filas.some((fila) => fila.revisando)) return "Estamos revisando tus cambios. Un momento.";
  if (filasElegidas(filas).length === 0) return "Marca al menos una fila para poder importar.";
  return null;
}

export type AccionFilas =
  | { tipo: "cargar"; filas: FilaAnalizadaImportacion[] }
  | { tipo: "editar"; fila: number; campo: CampoEditable; valor: string }
  | { tipo: "validada"; fila: number; version: number; validacion: ValidacionFilaImportacion }
  | { tipo: "revisionFallida"; filas: { fila: number; version: number }[] }
  | { tipo: "elegir"; fila: number; elegida: boolean }
  | { tipo: "elegirTodas"; elegida: boolean }
  | { tipo: "imagenesVerificadas"; filas: FilaImagenesVerificadas[] }
  | { tipo: "imagenesSinComprobar" };

const cambiarFila = (filas: FilaEditable[], numero: number, cambio: (fila: FilaEditable) => FilaEditable) =>
  filas.map((fila) => (fila.fila === numero ? cambio(fila) : fila));

export function reducirFilas(filas: FilaEditable[], accion: AccionFilas): FilaEditable[] {
  switch (accion.tipo) {
    case "cargar":
      return accion.filas.map(aFilaEditable);
    case "editar":
      return cambiarFila(filas, accion.fila, (fila) => editarCampo(fila, accion.campo, accion.valor));
    case "validada":
      return cambiarFila(filas, accion.fila, (fila) => aplicarValidacion(fila, accion.version, accion.validacion));
    case "revisionFallida":
      // No hubo respuesta del servidor: la fila deja de esperar y queda como estaba (se vuelve a revisar al importar).
      return filas.map((fila) => (accion.filas.some((enviada) => enviada.fila === fila.fila && enviada.version === fila.version) ? { ...fila, revisando: false } : fila));
    case "elegir":
      return cambiarFila(filas, accion.fila, (fila) => (esImportable(fila) ? { ...fila, elegida: accion.elegida } : fila));
    case "elegirTodas":
      return filas.map((fila) => (esImportable(fila) ? { ...fila, elegida: accion.elegida } : fila));
    case "imagenesVerificadas": {
      const porFila = new Map(accion.filas.map((verificacion) => [verificacion.fila, verificacion]));
      return filas.map((fila) => {
        const verificacion = porFila.get(fila.fila);
        return verificacion ? aplicarImagenesVerificadas(fila, verificacion) : fila;
      });
    }
    case "imagenesSinComprobar":
      return filas.map(olvidarComprobacionDeImagenes);
  }
}

export function trocear<T>(lista: readonly T[], tamano: number): T[][] {
  const tandas: T[][] = [];
  for (let desde = 0; desde < lista.length; desde += tamano) tandas.push(lista.slice(desde, desde + tamano));
  return tandas;
}

export const nombreCompleto = (datos: Pick<DatosFilaImportacion, "nombres" | "apellido_paterno" | "apellido_materno">) =>
  [datos.nombres, datos.apellido_paterno, datos.apellido_materno].map((parte) => parte.trim()).filter(Boolean).join(" ");
