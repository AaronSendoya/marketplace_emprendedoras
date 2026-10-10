import { registrarErrorDelCliente } from "@/lib/errores/registro";
import { MAX_BYTES_DE_REPORTE, sanitizarReporte } from "@/lib/errores/reporte";

// Recibe los errores que el navegador no pudo resolver (`lib/errores/reportar.ts`) y los deja en el registro del servidor. Es un
// punto sin sesión (un error puede ocurrir antes de iniciar sesión), así que se trata como entrada hostil:
//   - solo del propio sitio (cabecera `Origin` contra el host), para que otra página no pueda llenarlo;
//   - cuerpo de hasta 8 KB y JSON con la forma exacta (`sanitizarReporte`); lo que no cuadra se descarta sin avisar;
//   - un tope global de reportes por minuto: pasado el tope responde 204 igual y no escribe (nadie saca nada de esa respuesta);
//   - nunca devuelve nada ni guarda nada más que la línea del registro, ya sin correos, tokens ni identificadores.
const VENTANA_MS = 60_000;
const MAXIMO_POR_VENTANA = 60;

let inicioDeVentana = 0;
let contados = 0;

function dentroDelLimite(ahora: number): boolean {
  if (ahora - inicioDeVentana >= VENTANA_MS) {
    inicioDeVentana = ahora;
    contados = 0;
  }
  contados += 1;
  return contados <= MAXIMO_POR_VENTANA;
}

function esDelPropioSitio(request: Request): boolean {
  const origen = request.headers.get("origin");
  if (origen === null) return true; // `sendBeacon` y `fetch` del mismo sitio siempre la mandan; sin ella no es de un navegador.
  const anfitrion = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return anfitrion !== null && new URL(origen).host === anfitrion;
  } catch {
    return false;
  }
}

const sinContenido = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!esDelPropioSitio(request)) return new Response(null, { status: 403 });

  const declarado = Number(request.headers.get("content-length") ?? 0);
  if (declarado > MAX_BYTES_DE_REPORTE) return new Response(null, { status: 413 });

  let texto: string;
  try {
    texto = await request.text();
  } catch {
    return sinContenido();
  }
  if (texto.length > MAX_BYTES_DE_REPORTE) return new Response(null, { status: 413 });

  if (!dentroDelLimite(Date.now())) return sinContenido();

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return sinContenido();
  }
  const reporte = sanitizarReporte(cuerpo);
  if (reporte) registrarErrorDelCliente(reporte);
  return sinContenido();
}
