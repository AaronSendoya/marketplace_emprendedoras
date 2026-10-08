import type {
  AvisoImportacion,
  DatosFilaImportacion,
  EstadoFilaImportacion,
  FilaAnalizadaImportacion,
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
}

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
  | { tipo: "elegirTodas"; elegida: boolean };

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
  }
}

export function trocear<T>(lista: readonly T[], tamano: number): T[][] {
  const tandas: T[][] = [];
  for (let desde = 0; desde < lista.length; desde += tamano) tandas.push(lista.slice(desde, desde + tamano));
  return tandas;
}

export const nombreCompleto = (datos: Pick<DatosFilaImportacion, "nombres" | "apellido_paterno" | "apellido_materno">) =>
  [datos.nombres, datos.apellido_paterno, datos.apellido_materno].map((parte) => parte.trim()).filter(Boolean).join(" ");
