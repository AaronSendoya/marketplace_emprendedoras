import { MENSAJES_ARCHIVO } from "./mensajes";

// Regla 22: las dos primeras capas de "un archivo incompatible nunca queda adjunto". Funciones puras (salvo `revisarArchivo`,
// que lee los primeros bytes): la zona de arrastre las llama al soltar o elegir un archivo y, si no pasa, lo descarta y
// muestra el mensaje. La tercera capa es el servidor, que vuelve a revisar todo sin fiarse de nada de lo que declara el cliente.

export const TAMANO_MAXIMO_BYTES = 2 * 1024 * 1024;
export const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
// Lo que ofrece el selector de archivos (`accept`): solo `.xlsx`.
export const ACEPTA = `.xlsx,${TIPO_XLSX}`;

export type Veredicto = { ok: true } | { ok: false; mensaje: string };

const BIEN: Veredicto = { ok: true };
const rechazo = (mensaje: string): Veredicto => ({ ok: false, mensaje });

export interface ArchivoCandidato {
  nombre: string;
  tamano: number;
  esCarpeta?: boolean;
}

function nombreBase(nombre: string): string {
  return nombre.split(/[\\/]/).pop()?.trim() ?? "";
}

function extensionDe(nombre: string): string {
  return nombre.includes(".") ? (nombre.split(".").pop() ?? "").toLowerCase() : "";
}

const megabytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");

// Lo que se sabe sin abrir el archivo: cuántos son, si es una carpeta, su nombre y su tamaño.
export function revisarCandidatos(candidatos: readonly ArchivoCandidato[]): Veredicto {
  if (candidatos.length === 0) return rechazo(MENSAJES_ARCHIVO.noSePudoLeer);
  if (candidatos.length > 1) return rechazo(MENSAJES_ARCHIVO.varios(candidatos.length));

  const [candidato] = candidatos;
  if (candidato.esCarpeta) return rechazo(MENSAJES_ARCHIVO.carpeta);

  const nombre = nombreBase(candidato.nombre);
  const extension = extensionDe(nombre);

  if (nombre.startsWith("~$")) return rechazo(MENSAJES_ARCHIVO.temporal);
  if (extension === "xls") return rechazo(MENSAJES_ARCHIVO.xls);
  if (extension === "csv") return rechazo(MENSAJES_ARCHIVO.csv);
  if (extension === "xlsm" || extension === "xltm") return rechazo(MENSAJES_ARCHIVO.macros);
  if (extension === "gsheet") return rechazo(MENSAJES_ARCHIVO.googleSheets);
  if (extension !== "xlsx") return rechazo(MENSAJES_ARCHIVO.otroTipo(extension));

  if (candidato.tamano === 0) return rechazo(MENSAJES_ARCHIVO.vacio);
  if (candidato.tamano > TAMANO_MAXIMO_BYTES) return rechazo(MENSAJES_ARCHIVO.muyGrande(megabytes(candidato.tamano)));
  return BIEN;
}

const FIRMA_ZIP = [0x50, 0x4b, 0x03, 0x04];
// Excel antiguo (.xls) y también un .xlsx con contraseña (Excel lo guarda dentro de un contenedor de este tipo).
const FIRMA_OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

const empiezaCon = (bytes: Uint8Array, firma: number[]) => firma.every((valor, indice) => bytes[indice] === valor);

// Los primeros bytes de un `.xlsx` real son los de un ZIP. Un archivo renombrado a `.xlsx` no los tiene.
export function revisarFirma(primerosBytes: Uint8Array): Veredicto {
  if (empiezaCon(primerosBytes, FIRMA_OLE2)) return rechazo(MENSAJES_ARCHIVO.conContrasena);
  if (!empiezaCon(primerosBytes, FIRMA_ZIP)) return rechazo(MENSAJES_ARCHIVO.noEsExcel);
  return BIEN;
}

// Revisión completa de un archivo elegido o soltado: lo que se sabe sin abrirlo y, si pasa, sus primeros bytes.
export async function revisarArchivo(archivo: File): Promise<Veredicto> {
  const previo = revisarCandidatos([{ nombre: archivo.name, tamano: archivo.size }]);
  if (!previo.ok) return previo;
  try {
    return revisarFirma(new Uint8Array(await archivo.slice(0, 8).arrayBuffer()));
  } catch {
    return rechazo(MENSAJES_ARCHIVO.noSePudoLeer);
  }
}

export interface ElementoArrastrado {
  kind: string;
  type: string;
}

// Mientras se arrastra, el navegador solo dice cuántos elementos son y su tipo (no su nombre ni su tamaño): sirve para pintar
// la zona de naranja o de rojo, no para decidir. Si no declara el tipo (pasa con `.xlsx` en algunos equipos), se da por bueno
// y la revisión completa decide al soltar.
export function pareceCompatibleAlArrastrar(elementos: readonly ElementoArrastrado[]): boolean {
  if (elementos.length !== 1) return false;
  const [elemento] = elementos;
  if (elemento.kind !== "file") return false;
  return elemento.type === "" || elemento.type === TIPO_XLSX;
}

// Soltar un enlace (por ejemplo, el de una hoja de Google Sheets) en vez de un archivo.
export function mensajeDeEnlaceSoltado(tipos: readonly string[]): string | null {
  return tipos.includes("text/uri-list") || tipos.includes("text/plain") ? MENSAJES_ARCHIVO.googleSheets : null;
}
