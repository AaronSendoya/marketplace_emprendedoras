// Conexión con una cuenta de Google para cargar las imágenes de Drive (reglas 17 y 22). Sin imports a propósito: lo usan las
// rutas `/admin/google/conectar` y `/admin/google/callback` y lo prueba `oauth.test.ts` con el corredor de Node.

const BYTES_ALEATORIOS = 32;

function aBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 32 bytes aleatorios en base64url (43 caracteres): sirven de `state` y de verificador PKCE (RFC 7636 pide de 43 a 128).
export function valorAleatorio(): string {
  return aBase64Url(crypto.getRandomValues(new Uint8Array(BYTES_ALEATORIOS)));
}

// Desafío PKCE (método S256): SHA-256 del verificador, en base64url. Google solo canjea el código con el verificador original.
export async function desafioPkce(verificador: string): Promise<string> {
  const huella = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verificador));
  return aBase64Url(new Uint8Array(huella));
}

// Comparación sin salir en el primer carácter distinto: el `state` es un secreto de un solo uso.
export function sonIguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

const FORMA_VALOR = /^[A-Za-z0-9_-]{43}$/;
const FORMA_CODIGO = /^[A-Za-z0-9._~/+=-]{10,2048}$/;

export const esValorAleatorio = (texto: unknown): texto is string => typeof texto === "string" && FORMA_VALOR.test(texto);

// El código de autorización que devuelve Google es texto opaco que incluye `/` y `-` (por ejemplo `4/0AX…`). Misma forma que
// exige el backend; se comprueba antes de mandarlo.
export const esCodigoDeGoogle = (texto: unknown): texto is string => typeof texto === "string" && FORMA_CODIGO.test(texto);

// Lo que se guarda entre `conectar` y `callback`: `state` y verificador. Ninguno lleva `.`, así que un punto los separa.
export function empaquetarInicio(state: string, verificador: string): string {
  return `${state}.${verificador}`;
}

export function desempaquetarInicio(valor: string | null | undefined): { state: string; verificador: string } | null {
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 2) return null;
  const [state, verificador] = partes;
  return esValorAleatorio(state) && esValorAleatorio(verificador) ? { state, verificador } : null;
}

const HOSTS_LOCALES = ["localhost", "127.0.0.1", "[::1]"];

// ¿Es una dirección del propio computador? Sirve para saber si el sistema corre en una máquina de desarrollo: el backend en
// `localhost` solo existe ahí (en el hosting es un dominio público).
export function esDireccionLocal(texto: unknown): boolean {
  if (typeof texto !== "string") return false;
  try {
    return HOSTS_LOCALES.includes(new URL(texto).hostname);
  } catch {
    return false;
  }
}

// La dirección a la que se manda al navegador la arma el backend desde su configuración, y aun así no se sigue a ciegas: solo vale
// la pantalla de cuentas de Google. En un computador de desarrollo (`permitirLocal`) también `localhost`, que es donde está el
// servidor simulado de Google con el que se prueba sin una cuenta real.
export function esUrlDeAutorizacionValida(texto: unknown, permitirLocal: boolean): boolean {
  if (typeof texto !== "string") return false;
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.protocol === "https:" && url.hostname === "accounts.google.com") return true;
  return permitirLocal && (url.protocol === "http:" || url.protocol === "https:") && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
}

// Por qué no se pudo conectar. La pantalla final (`/conexion-google`) recibe solo uno de estos códigos en la dirección, nunca un
// texto libre: así un enlace armado a mano no puede mostrar un mensaje inventado.
export const MOTIVOS_DE_FALLO = {
  cancelado: "Cancelaste la conexión con Google. Puedes intentarlo de nuevo cuando quieras.",
  denegado: "Google no dio el permiso de lectura de Drive. Vuelve a intentarlo y acepta el permiso.",
  sin_sesion: "Tu sesión venció. Inicia sesión de nuevo y vuelve a conectar la cuenta.",
  sin_permiso: "Tu cuenta no puede conectar Google. Inicia sesión con una cuenta de Admin.",
  no_configurado: "El servidor no tiene configurada la conexión con Google. Avisa a quien administra el sistema.",
  estado_invalido: "La conexión venció o no se inició desde el importador. Vuelve al importador y conecta de nuevo.",
  rechazado: "Google no aceptó la conexión. Vuelve a intentarlo; si se repite, prueba con otra cuenta.",
  no_disponible: "No pudimos comunicarnos con el servidor. Inténtalo de nuevo en un momento.",
} as const;

export type MotivoDeFallo = keyof typeof MOTIVOS_DE_FALLO;

export function motivoDeFallo(valor: unknown): MotivoDeFallo {
  return typeof valor === "string" && Object.prototype.hasOwnProperty.call(MOTIVOS_DE_FALLO, valor) ? (valor as MotivoDeFallo) : "no_disponible";
}

// Nombre del canal por el que la pantalla final avisa a la página del importador. No lleva datos sensibles: solo «hubo un
// cambio»; el importador vuelve a preguntar al servidor (que lee la cookie) y no se fía del mensaje.
export const CANAL_DE_CONEXION_GOOGLE = "conexion-google";
