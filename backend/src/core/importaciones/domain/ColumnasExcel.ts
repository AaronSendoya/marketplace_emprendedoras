import { normalizarTexto } from "@/shared/domain/BusquedaSimilar";

// Regla 22: las columnas del Excel de Google Forms se reconocen por el texto de su encabezado, no por su posición, y sin
// importar tildes, mayúsculas, espacios ni signos. Así sirve aunque el formulario cambie un poco la redacción o el
// orden, y un encabezado desconocido no rompe nada: simplemente no se usa.

export type ClaveColumna =
  | "correo"
  | "nombreCompleto"
  | "whatsapp"
  | "ciudad"
  | "emprendimiento"
  | "descripcion"
  | "rubro"
  | "instagram";

export interface DefinicionColumna {
  clave: ClaveColumna;
  // Cómo se llama en el formulario de Google Forms (y en la plantilla de ejemplo).
  encabezado: string;
  // Cómo se nombra ante el Admin en los mensajes.
  nombre: string;
  obligatoria: boolean;
  // Recibe el encabezado ya normalizado (`normalizarEncabezado`).
  reconoce: (encabezado: string) => boolean;
}

// Sin tildes, en minúsculas y solo letras y números: "¿Te gustaría ofrecer…?" -> "tegustariaofrecer…".
export const normalizarEncabezado = (texto: string) => normalizarTexto(texto).replace(/[^a-z0-9]+/g, "");

const empieza = (h: string, ...prefijos: string[]) => prefijos.some((prefijo) => h.startsWith(prefijo));

// En el mismo orden en que vienen en el formulario.
export const COLUMNAS: readonly DefinicionColumna[] = [
  {
    clave: "correo",
    encabezado: "Dirección de correo electrónico",
    nombre: "Correo",
    obligatoria: true,
    reconoce: (h) => h.includes("correo") || h.includes("email") || h === "mail",
  },
  {
    clave: "nombreCompleto",
    encabezado: "Nombre Completo",
    nombre: "Nombre completo",
    obligatoria: true,
    reconoce: (h) => empieza(h, "nombrecompleto", "nombresyapellidos", "nombreyapellido") || h === "nombre",
  },
  {
    clave: "whatsapp",
    encabezado: "Número de WhatsApp",
    nombre: "Número de WhatsApp",
    obligatoria: true,
    reconoce: (h) => h.includes("whatsapp") || h.includes("celular") || h.includes("telefono"),
  },
  {
    clave: "ciudad",
    encabezado: "Ciudad",
    nombre: "Ciudad",
    obligatoria: true,
    reconoce: (h) => empieza(h, "ciudad"),
  },
  {
    clave: "emprendimiento",
    encabezado: "Nombre de tu emprendimiento",
    nombre: "Nombre de tu emprendimiento",
    obligatoria: true,
    reconoce: (h) => empieza(h, "nombredetuemprendimiento", "nombredelemprendimiento", "nombredetunegocio", "nombredelnegocio", "emprendimiento", "negocio"),
  },
  {
    clave: "descripcion",
    encabezado: "Breve descripción",
    nombre: "Breve descripción",
    obligatoria: true,
    reconoce: (h) => empieza(h, "brevedescripcion", "descripcion"),
  },
  {
    clave: "rubro",
    encabezado: "Rubro",
    nombre: "Rubro",
    obligatoria: true,
    reconoce: (h) => empieza(h, "rubro"),
  },
  {
    clave: "instagram",
    encabezado: "Instagram de tu emprendimiento",
    nombre: "Instagram",
    obligatoria: false,
    reconoce: (h) => empieza(h, "instagram"),
  },
];

export const COLUMNAS_OBLIGATORIAS = COLUMNAS.filter((columna) => columna.obligatoria);

// Columnas que el formulario trae y la importación no usa a propósito (regla 22): las imágenes se suben a mano, y la pregunta
// "¿Te gustaría ofrecer algo especial…?" con su "Cuéntanos sobre tu beneficio" no se registran en la base de datos.
const esColumnaIgnorada = (h: string) => empieza(h, "sube", "marcatemporal") || h.includes("ofrecer") || h.includes("beneficio");

export interface EncabezadosDetectados {
  // Índice de cada columna reconocida (0 = columna A).
  columnas: Partial<Record<ClaveColumna, number>>;
  // Encabezados que se ignoran a propósito (fotos y logo, marca temporal, beneficio).
  ignoradas: string[];
  // Encabezados que no son de ninguna columna conocida.
  desconocidas: string[];
}

// Cada encabezado cuenta para una sola columna y cada columna se asigna una sola vez (la primera que aparece).
export function detectarEncabezados(celdas: readonly string[]): EncabezadosDetectados {
  const columnas: Partial<Record<ClaveColumna, number>> = {};
  const ignoradas: string[] = [];
  const desconocidas: string[] = [];

  celdas.forEach((celda, indice) => {
    const texto = celda.trim();
    if (!texto) return;
    const normalizado = normalizarEncabezado(texto);
    if (esColumnaIgnorada(normalizado)) {
      ignoradas.push(texto);
      return;
    }
    const definicion = COLUMNAS.find((columna) => columnas[columna.clave] === undefined && columna.reconoce(normalizado));
    if (definicion) columnas[definicion.clave] = indice;
    else desconocidas.push(texto);
  });

  return { columnas, ignoradas, desconocidas };
}

// Cuántas columnas conocidas debe tener una fila para considerarla la de encabezados.
export const MINIMO_COLUMNAS_PARA_ENCABEZADO = 4;
// Hasta qué fila se busca la de encabezados (para avisar si no están en la primera).
export const FILAS_A_MIRAR_PARA_ENCABEZADO = 5;

export const faltantes = (detectadas: EncabezadosDetectados): DefinicionColumna[] =>
  COLUMNAS_OBLIGATORIAS.filter((columna) => detectadas.columnas[columna.clave] === undefined);
