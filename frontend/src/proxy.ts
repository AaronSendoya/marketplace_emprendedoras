import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// "middleware.ts" está obsoleto en esta versión de Next (renombrado a "proxy.ts"; confirmado con
// la propia advertencia del servidor de desarrollo y con backend/src/proxy.ts, que ya usa esta
// convención). Debe coincidir con NOMBRE_COOKIE de src/lib/auth/sesion.ts (ese módulo no se
// puede importar aquí: este archivo corre en el runtime Edge, aquel en Node).
const NOMBRE_COOKIE = "sesion";
const DIAS_400_EN_SEGUNDOS = 400 * 24 * 60 * 60;

// Renueva la cookie de sesión en cada visita (regla 5, backend: el token de Emprendedor no
// expira, sesión tipo red social). No decodifica ni valida el JWT: la caducidad real la impone la
// firma y el `exp` del propio token, verificados por el backend en cada petición. Si esto
// renueva de más la cookie de un Admin (24 h reales), el navegador solo sigue enviando un JWT que
// el backend ya rechaza — no es un hueco de seguridad, evita decodificar el token en el Edge.
export function proxy(request: NextRequest) {
  const cookieSesion = request.cookies.get(NOMBRE_COOKIE);
  if (!cookieSesion) return NextResponse.next();

  const respuesta = NextResponse.next();
  respuesta.cookies.set(NOMBRE_COOKIE, cookieSesion.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DIAS_400_EN_SEGUNDOS,
  });
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
