import { costeDeEdicion, normalizarTexto } from "@/shared/domain/BusquedaSimilar";

// Regla 22: las columnas del Excel de Google Forms se reconocen por el texto de su encabezado, no por su posición, y sin
// importar tildes, mayúsculas, espacios ni signos. Así sirve aunque el formulario cambie un poco la redacción o el
// orden, y un encabezado desconocido no rompe nada: simplemente no se usa. Un encabezado que no se reconoce a la primera
// pero se parece a uno esperado (una errata) se lee como ese, y el análisis lo dice para que el Admin lo confirme.

export type ClaveColumna =
  | "correo"
  | "nombreCompleto"
  | "whatsapp"
  | "ciudad"
  | "emprendimiento"
  | "descripcion"
  | "rubro"
  | "instagram"
  | "otraRed"
  | "foto"
  | "logo";

export interface DefinicionColumna {
  clave: ClaveColumna;
  // Cómo se llama en el formulario de Google Forms (y en la plantilla de ejemplo).
  encabezado: string;
  // Cómo se nombra ante el Admin en los mensajes.
  nombre: string;
  obligatoria: boolean;
  // Recibe el encabezado ya normalizado (`normalizarEncabezado`).
  reconoce: (encabezado: string) => boolean;
  // Cómo puede llamarse, ya normalizado: con ellos se compara un encabezado que `reconoce` no aceptó, para perdonar erratas.
  alias: readonly string[];
}

// Sin tildes, en minúsculas y solo letras y números: "¿Te gustaría ofrecer…?" -> "tegustariaofrecer…".
export const normalizarEncabezado = (texto: string) => normalizarTexto(texto).replace(/[^a-z0-9]+/g, "");

const empieza = (h: string, ...prefijos: string[]) => prefijos.some((prefijo) => h.startsWith(prefijo));
const alias = (...textos: string[]) => textos.map(normalizarEncabezado);

// En el mismo orden en que vienen en el formulario.
export const COLUMNAS: readonly DefinicionColumna[] = [
  {
    clave: "correo",
    encabezado: "Dirección de correo electrónico",
    nombre: "Correo",
    obligatoria: true,
    reconoce: (h) => h.includes("correo") || h.includes("email") || h === "mail",
    alias: alias("Dirección de correo electrónico", "Correo electrónico", "Correo", "Email"),
  },
  {
    clave: "nombreCompleto",
    encabezado: "Nombre Completo",
    nombre: "Nombre completo",
    obligatoria: true,
    reconoce: (h) => empieza(h, "nombrecompleto", "nombresyapellidos", "nombreyapellido") || h === "nombre",
    alias: alias("Nombre Completo", "Nombres y apellidos", "Nombre y apellido"),
  },
  {
    clave: "whatsapp",
    encabezado: "Número de WhatsApp",
    nombre: "Número de WhatsApp",
    obligatoria: true,
    reconoce: (h) => h.includes("whatsapp") || h.includes("celular") || h.includes("telefono"),
    alias: alias("Número de WhatsApp", "WhatsApp", "Celular", "Teléfono"),
  },
  {
    clave: "ciudad",
    encabezado: "Ciudad",
    nombre: "Ciudad",
    obligatoria: true,
    reconoce: (h) => empieza(h, "ciudad"),
    alias: alias("Ciudad"),
  },
  {
    clave: "emprendimiento",
    encabezado: "Nombre de tu emprendimiento",
    nombre: "Nombre de tu emprendimiento",
    obligatoria: true,
    reconoce: (h) => empieza(h, "nombredetuemprendimiento", "nombredelemprendimiento", "nombredetunegocio", "nombredelnegocio", "emprendimiento", "negocio"),
    alias: alias("Nombre de tu emprendimiento", "Nombre del emprendimiento", "Nombre de tu negocio", "Emprendimiento"),
  },
  {
    clave: "descripcion",
    encabezado: "Breve descripción",
    nombre: "Breve descripción",
    obligatoria: true,
    reconoce: (h) => empieza(h, "brevedescripcion", "descripcion"),
    alias: alias("Breve descripción", "Descripción"),
  },
  {
    clave: "rubro",
    encabezado: "Rubro",
    nombre: "Rubro",
    obligatoria: true,
    reconoce: (h) => empieza(h, "rubro"),
    alias: alias("Rubro"),
  },
  {
    clave: "instagram",
    encabezado: "Instagram de tu emprendimiento",
    nombre: "Instagram",
    obligatoria: false,
    reconoce: (h) => empieza(h, "instagram"),
    alias: alias("Instagram de tu emprendimiento", "Instagram"),
  },
  {
    clave: "otraRed",
    encabezado: "Otra red social",
    nombre: "Otra red social",
    obligatoria: false,
    reconoce: (h) => empieza(h, "otrared", "otrasredes", "redsocial"),
    alias: alias("Otra red social", "Otras redes sociales", "Red social"),
  },
  // Regla 22 (2026-10-09): enlaces de Drive de la foto de perfil y del logo, que se descargan al importar si hay una cuenta de Google
  // conectada. Son opcionales: sin ellas (o sin cuenta conectada) el perfil queda con las imágenes predeterminadas.
  {
    clave: "foto",
    encabezado: "Sube tu foto",
    nombre: "Foto de perfil",
    obligatoria: false,
    reconoce: (h) => empieza(h, "subetufoto", "subelafoto", "subefoto", "fotodeperfil", "fotografia", "foto"),
    alias: alias("Sube tu foto", "Foto de perfil", "Foto"),
  },
  {
    clave: "logo",
    encabezado: "Sube el logo de tu emprendimiento",
    nombre: "Logo",
    obligatoria: false,
    reconoce: (h) => empieza(h, "subeellogo", "subelogo", "logo"),
    alias: alias("Sube el logo de tu emprendimiento", "Logo de tu emprendimiento", "Logo"),
  },
];

export const COLUMNAS_OBLIGATORIAS = COLUMNAS.filter((columna) => columna.obligatoria);

// Los 14 encabezados del Excel de Google Forms, en su orden y con su texto exacto (el último termina en un espacio, como en el
// formulario real). Es lo que lleva la fila 1 de la plantilla de ejemplo; incluye las columnas que la importación ignora.
export const ENCABEZADOS_DEL_FORMULARIO: readonly string[] = [
  "Marca temporal",
  "Dirección de correo electrónico",
  "Nombre Completo",
  "Número de WhatsApp",
  "Ciudad",
  "Sube tu foto",
  "Nombre de tu emprendimiento",
  "Breve descripción",
  "Sube el logo de tu emprendimiento",
  "Rubro",
  "Instagram de tu emprendimiento",
  "Otra red social",
  "¿Te gustaría ofrecer algo especial a las emprendedoras del Track de Mujeres 2026?",
  "Cuéntanos sobre tu beneficio ",
];

// Columnas que el formulario trae y la importación no usa a propósito (regla 22): la marca temporal, y la pregunta
// "¿Te gustaría ofrecer algo especial…?" con su "Cuéntanos sobre tu beneficio", que no se registran en la base de datos. (La foto y el
// logo ya no se ignoran: se leen como enlaces de Drive.)
const esColumnaIgnorada = (h: string) => empieza(h, "marcatemporal") || h.includes("ofrecer") || h.includes("beneficio");
const ALIAS_IGNORADOS = alias("Marca temporal", "Cuéntanos sobre tu beneficio");

export interface EncabezadoAproximado {
  // Lo que decía el archivo.
  encabezado: string;
  // La columna esperada con la que se confundió (su nombre ante el Admin).
  columna: string;
}

export interface EncabezadosDetectados {
  // Índice de cada columna reconocida (0 = columna A).
  columnas: Partial<Record<ClaveColumna, number>>;
  // Encabezados que se ignoran a propósito (marca temporal, beneficio).
  ignoradas: string[];
  // Encabezados que no son de ninguna columna conocida: no se usan.
  desconocidas: string[];
  // Encabezados que se leyeron como una columna esperada por parecerse a ella (una errata), para que el Admin lo confirme.
  aproximadas: EncabezadoAproximado[];
}

// Cuántas diferencias completas (cada una cuesta 10, como en la búsqueda) se perdonan según el largo del nombre esperado.
const COSTE_DE_UNA_DIFERENCIA = 10;
function diferenciasPerdonadas(largo: number): number {
  if (largo <= 2) return 0;
  if (largo <= 5) return 1;
  return largo <= 10 ? 2 : 3;
}

const costeContra = (encabezado: string, esperados: readonly string[]) =>
  esperados.reduce((mejor, esperado) => {
    const presupuesto = diferenciasPerdonadas(esperado.length) * COSTE_DE_UNA_DIFERENCIA;
    const coste = costeDeEdicion(encabezado, esperado, presupuesto);
    return coste <= presupuesto && coste < mejor ? coste : mejor;
  }, Infinity);

// Cada encabezado cuenta para una sola columna y cada columna se asigna una sola vez (la primera que aparece). Primero se
// reconoce por su texto; los que no, se comparan por parecido con lo que falta, para perdonar erratas, y lo que tampoco se
// parece queda como desconocido.
export function detectarEncabezados(celdas: readonly string[]): EncabezadosDetectados {
  const columnas: Partial<Record<ClaveColumna, number>> = {};
  const ignoradas: string[] = [];
  const desconocidas: string[] = [];
  const aproximadas: EncabezadoAproximado[] = [];
  const pendientes: { texto: string; normalizado: string; indice: number }[] = [];

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
    else pendientes.push({ texto, normalizado, indice });
  });

  for (const { texto, normalizado, indice } of pendientes) {
    let mejor: { definicion: DefinicionColumna; coste: number } | null = null;
    for (const definicion of COLUMNAS) {
      if (columnas[definicion.clave] !== undefined) continue;
      const coste = costeContra(normalizado, definicion.alias);
      if (coste !== Infinity && (!mejor || coste < mejor.coste)) mejor = { definicion, coste };
    }
    const contraLasIgnoradas = costeContra(normalizado, ALIAS_IGNORADOS);
    if (mejor && mejor.coste <= contraLasIgnoradas) {
      columnas[mejor.definicion.clave] = indice;
      aproximadas.push({ encabezado: texto, columna: mejor.definicion.nombre });
    } else if (contraLasIgnoradas !== Infinity) ignoradas.push(texto);
    else desconocidas.push(texto);
  }

  return { columnas, ignoradas, desconocidas, aproximadas };
}

// Cuántas columnas conocidas debe tener una fila para considerarla la de encabezados.
export const MINIMO_COLUMNAS_PARA_ENCABEZADO = 4;
// Hasta qué fila se busca la de encabezados (para avisar si no están en la primera).
export const FILAS_A_MIRAR_PARA_ENCABEZADO = 5;

export const faltantes = (detectadas: EncabezadosDetectados): DefinicionColumna[] =>
  COLUMNAS_OBLIGATORIAS.filter((columna) => detectadas.columnas[columna.clave] === undefined);
