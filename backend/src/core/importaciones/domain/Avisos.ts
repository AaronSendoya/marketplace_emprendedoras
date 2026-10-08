// Regla 22: los mensajes que ve el Admin en la vista previa, uno por situación, en lenguaje simple: qué pasó, con el dato
// afectado, y qué hacer. Todos viven aquí para editarlos en un solo sitio; el frontend los muestra tal cual.

export type CampoFila =
  | "fila"
  | "correo"
  | "nombres"
  | "apellidoPaterno"
  | "apellidoMaterno"
  | "whatsapp"
  | "ciudad"
  | "rubro"
  | "nombreNegocio"
  | "descripcion"
  | "instagram"
  | "otraRedSocial";

// `error` impide importar la fila; `revisar` es una suposición del sistema que conviene mirar; `info` solo informa.
export type Severidad = "error" | "revisar" | "info";

export interface Aviso {
  campo: CampoFila;
  codigo: string;
  severidad: Severidad;
  mensaje: string;
  // Va también al reporte "por revisar" que se descarga al terminar (Instagram no reconocido, enlaces demasiado largos…).
  reporte: boolean;
}

const aviso = (campo: CampoFila, codigo: string, severidad: Severidad, mensaje: string, reporte = false): Aviso => ({
  campo,
  codigo,
  severidad,
  mensaje,
  reporte,
});

const valor = (texto: string) => (texto.length > 60 ? `${texto.slice(0, 57)}…` : texto);

export const AVISOS = {
  correoVacio: () => aviso("correo", "correo_vacio", "error", "Falta el correo. Es necesario para crear la cuenta."),
  correoInvalido: (correo: string) =>
    aviso("correo", "correo_invalido", "error", `El correo «${valor(correo)}» no es válido. Revisa que tenga @ y un dominio, por ejemplo nombre@gmail.com.`),
  correoRepetido: (otraFila: number) =>
    aviso("correo", "correo_repetido", "error", `Este correo ya aparece en la fila ${otraFila}. Se importará solo la primera.`),
  correoExistente: () =>
    aviso("correo", "correo_existente", "info", "Esta persona ya tiene cuenta. Se omitirá; no se cambia nada de lo que ya tiene."),

  nombreVacio: () => aviso("nombres", "nombre_vacio", "error", "Falta el nombre completo."),
  nombreUnaPalabra: () => aviso("nombres", "nombre_una_palabra", "error", "Solo tiene una palabra. Escribe nombre y apellido para poder crear la cuenta."),
  nombreTresPalabras: (nombres: string, apellidos: string) =>
    aviso("nombres", "nombre_tres_palabras", "revisar", `Revisa la separación: tomamos «${nombres}» como nombre y «${apellidos}» como apellidos.`),
  nombreCompuesto: (nombres: string, apellidos: string) =>
    aviso(
      "nombres",
      "nombre_apellido_compuesto",
      "revisar",
      `Parece tener un apellido compuesto. Revisa la separación: tomamos «${nombres}» como nombre y «${apellidos}» como apellidos.`,
    ),
  nombreLargo: () =>
    aviso("nombres", "nombre_largo", "error", "El nombre o el apellido es demasiado largo (nombres: máximo 100 caracteres; cada apellido: máximo 50)."),

  whatsappVacio: () => aviso("whatsapp", "whatsapp_vacio", "error", "Falta el WhatsApp."),
  whatsappInvalido: (texto: string) =>
    aviso(
      "whatsapp",
      "whatsapp_invalido",
      "error",
      `El WhatsApp «${valor(texto)}» no es válido. En Bolivia son 8 dígitos y empiezan con 6 o 7; con otro país, escribe el código con +.`,
    ),

  ciudadVacia: () => aviso("ciudad", "ciudad_vacia", "error", "Falta la ciudad. Elige una de la lista."),
  ciudadDesconocida: (texto: string) =>
    aviso("ciudad", "ciudad_desconocida", "error", `La ciudad «${valor(texto)}» no existe en el sistema. Elige una de la lista.`),

  rubroVacio: () => aviso("rubro", "rubro_vacio", "error", "Falta el rubro. Elige uno de la lista."),
  rubroDesconocido: (texto: string) =>
    aviso("rubro", "rubro_desconocido", "error", `No sabemos a qué rubro corresponde «${valor(texto)}». Elige uno de la lista.`),

  negocioVacio: () => aviso("nombreNegocio", "negocio_vacio", "error", "Falta el nombre del emprendimiento."),
  negocioLargo: (largo: number) =>
    aviso("nombreNegocio", "negocio_largo", "error", `El nombre del emprendimiento tiene ${largo} caracteres; el máximo es 150.`),
  descripcionVacia: () => aviso("descripcion", "descripcion_vacia", "error", "Falta la descripción."),
  descripcionLarga: (largo: number) =>
    aviso("descripcion", "descripcion_larga", "error", `La descripción tiene ${largo} caracteres; el máximo es 2000.`),

  instagramNinguno: () => aviso("instagram", "instagram_ninguno", "info", "Sin Instagram. Está bien, es opcional."),
  instagramIrreconocible: (texto: string) =>
    aviso(
      "instagram",
      "instagram_irreconocible",
      "revisar",
      `No pudimos reconocer «${valor(texto)}» como un usuario de Instagram. Se dejará vacío; puedes escribirlo aquí.`,
      true,
    ),
  instagramInvalido: (texto: string) =>
    aviso(
      "instagram",
      "instagram_invalido",
      "error",
      `«${valor(texto)}» no es un usuario de Instagram válido: solo letras, números, puntos y guiones bajos (máximo 30).`,
    ),
  otraRed: () => aviso("instagram", "otra_red", "info", "Este enlace no es de Instagram. Se guardará como «otra red social»."),
  otraRedLarga: (texto: string) =>
    aviso(
      "instagram",
      "otra_red_larga",
      "info",
      `El enlace «${valor(texto)}» es demasiado largo para «otra red social» (máximo 50 caracteres). Se dejará vacío y quedará en el reporte.`,
      true,
    ),
  otraRedColumnaLarga: (texto: string) =>
    aviso(
      "otraRedSocial",
      "otra_red_larga",
      "info",
      `«Otra red social» («${valor(texto)}») es demasiado larga (máximo 50 caracteres). Se dejará vacía y quedará en el reporte.`,
      true,
    ),
  otraRedRepetida: (enlace: string) =>
    aviso(
      "instagram",
      "otra_red_repetida",
      "revisar",
      `La columna de Instagram trae un enlace que no es de Instagram («${valor(enlace)}»), pero ya hay una «otra red social». Se guardó la de su columna; este enlace queda en el reporte.`,
      true,
    ),
  otraRedLargaEditada: (largo: number) =>
    aviso("otraRedSocial", "otra_red_larga", "error", `«Otra red social» tiene ${largo} caracteres; el máximo es 50.`),

  filaOculta: () =>
    aviso("fila", "fila_oculta", "info", "Esta fila estaba oculta por un filtro del Excel. Quedó sin marcar; márcala si quieres importarla."),
};
