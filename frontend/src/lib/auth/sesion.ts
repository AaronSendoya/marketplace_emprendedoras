import "server-only";
import { cookies } from "next/headers";
import type { Rol } from "@/lib/api/tipos";

// Un solo nombre de cookie para los dos roles: el rol y `activo` siempre se leen del backend en
// cada petición autenticada (regla 5), así que no hace falta duplicarlos aquí. Debe coincidir con
// el literal usado en src/middleware.ts (ese archivo no puede importar de aquí: corre en el
// runtime Edge, este módulo no).
export const NOMBRE_COOKIE = "sesion";

const SEGUNDO = 1;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

// Duración inicial al iniciar sesión (regla 5, backend): el token de Admin expira a las 4 horas
// (la cookie dura lo mismo y src/proxy.ts no la renueva), el de Emprendedor no expira (sesión tipo
// red social). ~400 días es el máximo que aceptan los navegadores para una cookie; a partir de
// ahí, src/proxy.ts la renueva en cada visita.
function duracionSegundos(rol: Rol): number {
  return rol === "Admin" ? 4 * HORA : 400 * DIA;
}

// Solo se llama desde una Server Function ('use server'), nunca durante el render de un Server
// Component (cookies().set lanza fuera de ese contexto).
export async function crearCookieSesion(token: string, rol: Rol): Promise<void> {
  const almacen = await cookies();
  almacen.set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: duracionSegundos(rol),
  });
}

export async function cerrarCookieSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(NOMBRE_COOKIE);
}

// Lectura simple para Server Components (ej. SesionNavIcono): solo dice si hay sesión, no valida
// el token contra el backend.
export async function haySesion(): Promise<boolean> {
  const almacen = await cookies();
  return almacen.has(NOMBRE_COOKIE);
}

// El valor crudo del JWT, para las peticiones autenticadas (lib/api/cliente.ts). No lo decodifica
// ni lo valida: eso lo hace el backend en cada petición (regla 5) vía GET /auth/me.
export async function obtenerToken(): Promise<string | null> {
  const almacen = await cookies();
  return almacen.get(NOMBRE_COOKIE)?.value ?? null;
}
