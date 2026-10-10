import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getEnv } from "@/shared/config/env";

// Regla 1 (CORS estricto): el backend valida la cabecera Origin en toda petición a /api/*.
//   - Sin Origin: no es una petición de navegador (llamada servidor a servidor del frontend,
//     curl, un script...); pasa sin tocar. Esas llamadas se protegen con el JWT (regla 5).
//   - Origin presente y permitido (el del propio backend, porque Swagger llama a la API desde
//     la misma pestaña, o uno de CORS_ALLOWED_ORIGINS): se agregan las cabeceras CORS.
//   - Origin presente y no permitido: 403, sea o no un preflight. La regla dice "solo se
//     permite el dominio en producción del frontend", no solo "rechazar el preflight"; el
//     preflight es el caso que menciona la verificación del plan, pero cualquier método con un
//     Origin ajeno se rechaza igual, sin llegar a ejecutar la ruta.
const METODOS_PERMITIDOS = "GET, POST, PATCH, PUT, DELETE, OPTIONS";
const CABECERAS_PERMITIDAS = "Content-Type, Authorization";
const MAX_AGE_PREFLIGHT = "86400"; // 24 horas: cuánto puede el navegador reutilizar el preflight.

// Los códigos de un solo uso (regla 15), las respuestas de sesión, las de Admin (la creación de
// cuentas devuelve una contraseña temporal) y las de «mis» datos (el precio real de los productos
// aunque esté oculto, regla 7) no deben quedar en la caché del navegador ni de un proxy intermedio.
const RUTAS_SIN_CACHE = /^\/api\/v1\/(auth|admin|mis)(\/|$)/;

function aplicarCabecerasCors(cabeceras: Headers, origin: string): void {
  cabeceras.set("Access-Control-Allow-Origin", origin);
  cabeceras.set("Access-Control-Allow-Methods", METODOS_PERMITIDOS);
  cabeceras.set("Access-Control-Allow-Headers", CABECERAS_PERMITIDAS);
  cabeceras.set("Access-Control-Max-Age", MAX_AGE_PREFLIGHT);
  // La respuesta depende del Origin recibido: evita que una caché intermedia sirva a un origen
  // las cabeceras calculadas para otro.
  cabeceras.set("Vary", "Origin");
}

function aplicarCabecerasSeguridad(cabeceras: Headers, pathname: string): void {
  cabeceras.set("X-Content-Type-Options", "nosniff");
  cabeceras.set("X-Frame-Options", "DENY");
  cabeceras.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Sin includeSubDomains ni preload: no controlamos el resto de subdominios (frontend, correo).
  // Un navegador ignora esta cabecera si la conexión no es https (inofensiva en local).
  cabeceras.set("Strict-Transport-Security", "max-age=31536000");
  if (RUTAS_SIN_CACHE.test(pathname)) {
    cabeceras.set("Cache-Control", "no-store");
  }
}

function construirRespuesta(request: NextRequest, origin: string | null, origenesConfigurados: string[]): NextResponse {
  // Sin Origin: no es una petición de navegador. Pasa sin cabeceras CORS.
  if (origin === null) return NextResponse.next();

  const permitidos = new Set([request.nextUrl.origin, ...origenesConfigurados]);
  if (!permitidos.has(origin)) return new NextResponse(null, { status: 403 });

  if (request.method === "OPTIONS") {
    const cabeceras = new Headers();
    aplicarCabecerasCors(cabeceras, origin);
    return new NextResponse(null, { status: 204, headers: cabeceras });
  }

  const respuesta = NextResponse.next();
  aplicarCabecerasCors(respuesta.headers, origin);
  return respuesta;
}

// Lógica pura (sin leer variables de entorno): así se prueba con distintos orígenes permitidos
// sin depender de getEnv(). El origen del propio backend se agrega siempre. Las cabeceras de
// seguridad van en toda respuesta, incluido el 403: no dependen del origen, solo de la ruta.
export function manejarCors(request: NextRequest, origenesConfigurados: string[]): NextResponse {
  const respuesta = construirRespuesta(request, request.headers.get("origin"), origenesConfigurados);
  aplicarCabecerasSeguridad(respuesta.headers, request.nextUrl.pathname);
  return respuesta;
}

export function proxy(request: NextRequest): NextResponse {
  return manejarCors(request, getEnv().CORS_ALLOWED_ORIGINS);
}

export const config = {
  matcher: "/api/:path*",
};
