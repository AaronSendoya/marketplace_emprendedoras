import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { construirCsp, generarNonce } from "@/lib/seguridad/csp";
import { esTokenSinVencimiento } from "@/lib/seguridad/token";

// "middleware.ts" está obsoleto en esta versión de Next (renombrado a "proxy.ts"; confirmado con
// la propia advertencia del servidor de desarrollo y con backend/src/proxy.ts, que ya usa esta
// convención). Debe coincidir con NOMBRE_COOKIE de src/lib/auth/sesion.ts (ese módulo no se
// puede importar aquí: usa `server-only` y `next/headers`).
const NOMBRE_COOKIE = "sesion";
const DIAS_400_EN_SEGUNDOS = 400 * 24 * 60 * 60;

// Hace dos cosas en cada petición de página:
//
// 1. Content-Security-Policy con un nonce nuevo (regla 17). Next lee el nonce de la cabecera de la PETICIÓN y se lo pone a sus
//    propios scripts al renderizar, por eso la política se fija en la petición además de en la respuesta. Para que haya nonce
//    la página debe renderizarse en cada petición (una página estática no tiene petición y sus scripts quedarían bloqueados):
//    hoy todas las rutas son dinámicas y `next build` lo confirma con la «ƒ» de cada una. Las demás cabeceras de seguridad
//    (que no cambian entre peticiones) las pone next.config.ts.
//
// 2. Renueva la cookie de sesión en cada visita (regla 5, backend: el token de Emprendedor no
//    expira, sesión tipo red social), pero solo si el token no lleva `exp`. La cookie del Admin
//    (token de 4 horas) nace con esa misma vigencia y NO se renueva: desaparece con su token. Lee el
//    cuerpo del JWT sin verificar su firma, y no hace falta: la validez real la impone el backend
//    (firma, `exp`, usuario activo) en cada petición; esto solo decide cuánto vive la cookie.
export function proxy(request: NextRequest) {
  const csp = construirCsp({ nonce: generarNonce(), desarrollo: process.env.NODE_ENV === "development" });

  // Se sobrescribe siempre: una política enviada por el cliente nunca debe llegar a Next.
  const cabecerasPeticion = new Headers(request.headers);
  cabecerasPeticion.set("Content-Security-Policy", csp);

  const respuesta = NextResponse.next({ request: { headers: cabecerasPeticion } });
  respuesta.headers.set("Content-Security-Policy", csp);

  const cookieSesion = request.cookies.get(NOMBRE_COOKIE);
  if (cookieSesion && esTokenSinVencimiento(cookieSesion.value)) {
    respuesta.cookies.set(NOMBRE_COOKIE, cookieSesion.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DIAS_400_EN_SEGUNDOS,
    });
  }
  return respuesta;
}

// Se omiten los archivos estáticos y, como recomienda la guía de CSP de Next, las precargas de enlaces (`next/link`): no
// renderizan una página con scripts, así que no necesitan nonce.
export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
