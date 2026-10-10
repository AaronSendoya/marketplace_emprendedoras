import { normalizarInstagram } from "@/core/perfiles/domain/Instagram";
import { MAXIMO_OTRA_RED_SOCIAL } from "@/core/perfiles/domain/OtraRedSocial";
import { normalizarWhatsapp } from "@/core/perfiles/domain/Whatsapp";
import { ErrorValidacion } from "@/shared/domain/errors";
import { AVISOS, type Aviso, type CampoDeImagen } from "./Avisos";
import { resolverCiudad, resolverRubro, type Referencia } from "./CatalogoDeExcel";
import type { ClaveColumna } from "./ColumnasExcel";
import { interpretarEnlaceDeDrive } from "./EnlaceDrive";
import { clasificarInstagram, clasificarOtraRed } from "./InstagramDeExcel";
import { separarNombreCompleto } from "./NombreCompleto";

// Regla 22: lo que la vista previa muestra y el Admin puede corregir de cada fila, y lo que `importar` recibe de vuelta. El
// servidor nunca da por buena la vista previa: vuelve a validar estos mismos datos antes de escribir nada.
export interface DatosFila {
  correo: string;
  nombres: string;
  apellidoPaterno: string;
  // Vacío = la persona no tiene apellido materno (regla 10).
  apellidoMaterno: string;
  // En la vista previa ya normalizado y con `+` (por ejemplo +59171234567) cuando es válido; si no, tal como vino.
  whatsapp: string;
  ciudadId: string;
  // Lo que decía el Excel, solo para los mensajes; nunca se guarda.
  ciudadTexto: string;
  rubroId: string;
  rubroTexto: string;
  nombreNegocio: string;
  descripcion: string;
  // Usuario de Instagram sin arroba; vacío = sin Instagram.
  instagram: string;
  otraRedSocial: string;
  // Id del archivo de Drive de la foto de perfil y del logo, sacado del enlace del Excel (regla 22, 2026-10-09). Vacío = sin imagen:
  // queda la predeterminada (regla 11). Solo letras, números, guion y guion bajo (`ID_DE_DRIVE`): nunca una dirección.
  fotoDriveId: string;
  logoDriveId: string;
}

export interface ContextoCatalogos {
  ciudades: Referencia[];
  rubros: Referencia[];
}

const MAXIMO = { nombres: 100, apellido: 50, negocio: 150, descripcion: 2000, correo: 254 };
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();

const ORDEN: Record<Aviso["severidad"], number> = { error: 0, revisar: 1, info: 2 };
export const ordenarAvisos = (avisos: Aviso[]): Aviso[] => [...avisos].sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);

export type EstadoDeAvisos = "lista" | "revisar" | "error";
export function estadoDeAvisos(avisos: readonly Aviso[]): EstadoDeAvisos {
  if (avisos.some((aviso) => aviso.severidad === "error")) return "error";
  return avisos.some((aviso) => aviso.severidad === "revisar") ? "revisar" : "lista";
}

// Solo los errores: lo que impide crear la cuenta y el perfil. Usa las mismas reglas que los casos de uso que escriben
// (regla 2, regla 3), de modo que lo que aquí pasa, allí también.
export function validarDatosFila(datos: DatosFila, catalogos: ContextoCatalogos): Aviso[] {
  const avisos: Aviso[] = [];

  const correo = normalizarCorreo(datos.correo);
  if (!correo) avisos.push(AVISOS.correoVacio());
  else if (!CORREO_VALIDO.test(correo) || correo.length > MAXIMO.correo) avisos.push(AVISOS.correoInvalido(datos.correo));

  const nombres = datos.nombres.trim();
  const paterno = datos.apellidoPaterno.trim();
  if (!nombres && !paterno) avisos.push(AVISOS.nombreVacio());
  else if (!nombres || !paterno) avisos.push(AVISOS.nombreUnaPalabra());
  else if (nombres.length > MAXIMO.nombres || paterno.length > MAXIMO.apellido || datos.apellidoMaterno.trim().length > MAXIMO.apellido) {
    avisos.push(AVISOS.nombreLargo());
  }

  const whatsapp = datos.whatsapp.trim();
  if (!whatsapp) avisos.push(AVISOS.whatsappVacio());
  else {
    try {
      normalizarWhatsapp(whatsapp);
    } catch (error) {
      if (!(error instanceof ErrorValidacion)) throw error;
      avisos.push(AVISOS.whatsappInvalido(datos.whatsapp));
    }
  }

  if (!catalogos.ciudades.some((ciudad) => ciudad.id === datos.ciudadId)) {
    avisos.push(datos.ciudadTexto.trim() || datos.ciudadId ? AVISOS.ciudadDesconocida(datos.ciudadTexto || "sin nombre") : AVISOS.ciudadVacia());
  }
  if (!catalogos.rubros.some((rubro) => rubro.id === datos.rubroId)) {
    avisos.push(datos.rubroTexto.trim() || datos.rubroId ? AVISOS.rubroDesconocido(datos.rubroTexto || "sin nombre") : AVISOS.rubroVacio());
  }

  const negocio = datos.nombreNegocio.trim();
  if (!negocio) avisos.push(AVISOS.negocioVacio());
  else if (negocio.length > MAXIMO.negocio) avisos.push(AVISOS.negocioLargo(negocio.length));

  const descripcion = datos.descripcion.trim();
  if (!descripcion) avisos.push(AVISOS.descripcionVacia());
  else if (descripcion.length > MAXIMO.descripcion) avisos.push(AVISOS.descripcionLarga(descripcion.length));

  if (datos.instagram.trim()) {
    try {
      normalizarInstagram(datos.instagram);
    } catch (error) {
      if (!(error instanceof ErrorValidacion)) throw error;
      avisos.push(AVISOS.instagramInvalido(datos.instagram));
    }
  }
  if (datos.otraRedSocial.trim().length > MAXIMO_OTRA_RED_SOCIAL) avisos.push(AVISOS.otraRedLargaEditada(datos.otraRedSocial.trim().length));

  return avisos;
}

// Lo que se leyó de cada columna de una fila del Excel, ya convertido a texto. `undefined` = el archivo no trae esa columna.
export type CeldasDeFila = Partial<Record<ClaveColumna, string>>;

export interface FilaConstruida {
  datos: DatosFila;
  avisos: Aviso[];
  // Lo que decían el Excel en Instagram y en «otra red social», para el reporte "por revisar".
  textos: { instagram: string; otraRed: string };
}

// De las celdas del Excel a los datos de la fila, con las suposiciones señaladas (nombre, Instagram) y los errores de
// validación.
export function construirFila(celdas: CeldasDeFila, catalogos: ContextoCatalogos): FilaConstruida {
  const avisos: Aviso[] = [];
  const texto = (clave: ClaveColumna) => (celdas[clave] ?? "").trim();

  const nombre = separarNombreCompleto(texto("nombreCompleto"));
  const apellidos = [nombre.apellidoPaterno, nombre.apellidoMaterno].filter(Boolean).join(" ");
  if (nombre.avisos.includes("tres_palabras")) avisos.push(AVISOS.nombreTresPalabras(nombre.nombres, apellidos));
  if (nombre.avisos.includes("apellido_compuesto")) avisos.push(AVISOS.nombreCompuesto(nombre.nombres, apellidos));

  // Se guarda con `+` delante: así vuelve a normalizarse igual (sin él, un número de otro país ya normalizado se rechazaría la
  // segunda vez, porque la regla 2 exige el código explícito) y se ve claro en la vista previa.
  let whatsapp = texto("whatsapp");
  try {
    whatsapp = `+${normalizarWhatsapp(whatsapp)}`;
  } catch (error) {
    if (!(error instanceof ErrorValidacion)) throw error;
  }

  const ciudadTexto = texto("ciudad");
  const ciudad = resolverCiudad(ciudadTexto, catalogos.ciudades);

  const rubroTexto = texto("rubro");
  const rubro = resolverRubro(rubroTexto, catalogos.rubros);

  // Instagram y «otra red social» son dos columnas. La de Instagram a veces trae un enlace que no es de Instagram: solo se usa
  // para «otra red social» si su propia columna no trae nada válido.
  let instagram = "";
  let otraRedSocial = "";
  const enInstagram = clasificarInstagram(texto("instagram"));
  const enSuColumna = clasificarOtraRed(texto("otraRed"));
  if (enInstagram.tipo === "instagram") instagram = enInstagram.usuario;
  else if (enInstagram.tipo === "sin_instagram") avisos.push(AVISOS.instagramNinguno());
  else if (enInstagram.tipo === "irreconocible") avisos.push(AVISOS.instagramIrreconocible(enInstagram.texto));

  const enlaceEnInstagram = enInstagram.tipo === "otra_red" || enInstagram.tipo === "otra_red_larga" ? enInstagram : null;
  if (enSuColumna.tipo === "texto") {
    otraRedSocial = enSuColumna.texto;
    if (enlaceEnInstagram) avisos.push(AVISOS.otraRedRepetida(enlaceEnInstagram.texto));
  } else {
    if (enSuColumna.tipo === "texto_largo") avisos.push(AVISOS.otraRedColumnaLarga(enSuColumna.texto));
    if (enlaceEnInstagram?.tipo === "otra_red") {
      otraRedSocial = enlaceEnInstagram.texto;
      avisos.push(AVISOS.otraRed());
    } else if (enlaceEnInstagram?.tipo === "otra_red_larga") avisos.push(AVISOS.otraRedLarga(enlaceEnInstagram.texto));
  }

  // Fotos y logos: de cada enlace solo se toma el id. Un enlace que no sirve es una advertencia de la fila, no un error: la fila se importa
  // igual y esa imagen queda como la predeterminada.
  const idDeDrive = (campo: CampoDeImagen): string => {
    const enlace = interpretarEnlaceDeDrive(texto(campo));
    if (enlace.tipo === "archivo") return enlace.id;
    if (enlace.tipo === "carpeta") avisos.push(AVISOS.imagenEsCarpeta(campo));
    else if (enlace.tipo === "invalido") avisos.push(AVISOS.imagenEnlaceInvalido(campo, enlace.texto));
    return "";
  };

  const datos: DatosFila = {
    correo: normalizarCorreo(texto("correo")),
    nombres: nombre.nombres,
    apellidoPaterno: nombre.apellidoPaterno,
    apellidoMaterno: nombre.apellidoMaterno ?? "",
    whatsapp,
    ciudadId: ciudad?.id ?? "",
    ciudadTexto,
    rubroId: rubro?.id ?? "",
    rubroTexto,
    nombreNegocio: texto("emprendimiento").replace(/\s+/g, " "),
    descripcion: texto("descripcion"),
    instagram,
    otraRedSocial,
    fotoDriveId: idDeDrive("foto"),
    logoDriveId: idDeDrive("logo"),
  };

  avisos.push(...validarDatosFila(datos, catalogos));
  return { datos, avisos: ordenarAvisos(avisos), textos: { instagram: texto("instagram"), otraRed: texto("otraRed") } };
}
