import { LayoutDashboard, LogIn, LogOut, Store } from "lucide-react";
import Link from "next/link";
import { cerrarSesionAction } from "@/lib/auth/acciones";
import { obtenerMe } from "@/lib/api/auth";
import type { Rol } from "@/lib/api/tipos";
import { haySesion } from "@/lib/auth/sesion";
import { CLASES_FOCO_CONTROL } from "@/lib/estilos";

// Botón cuadrado de 40 px con borde (CLAUDE.md sección 6, regla 14), el mismo del menú móvil del Navbar.
const CLASES_BOTON = `inline-flex h-10 w-10 items-center justify-center rounded-lg border border-borde-fuerte bg-superficie text-texto-secundario transition-colors hover:bg-fondo hover:text-texto ${CLASES_FOCO_CONTROL}`;

// Server Component: se renderiza en el servidor (con acceso a la cookie de sesión, regla 5) y se
// pasa como children/prop al Navbar (Client Component) — así el Navbar no necesita convertirse en
// async ni leer cookies él mismo. Sin sesión, un solo ícono para entrar, sin texto ni color de
// marca: no se lee como invitación para un visitante casual, pero quien ya sabe qué busca lo
// reconoce (aria-label). Con sesión, un segundo ícono "ir a mi panel" (pedido explícito
// 2026-10-01: son dos acciones distintas, no una repetición como el CTA que ya corregimos): el
// Admin va a /admin y la Emprendedora a /mi-negocio.
export async function SesionNavIcono() {
  const sesionActiva = await haySesion();

  if (!sesionActiva) {
    return (
      <Link href="/iniciar-sesion" aria-label="Iniciar sesión" className={CLASES_BOTON}>
        <LogIn size={20} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    );
  }

  let rol: Rol | null = null;
  try {
    const yo = await obtenerMe();
    rol = yo.rol;
  } catch {
    // Cookie presente pero token inválido o vencido (ej. el Admin tras 24 h): se sigue mostrando
    // el botón de cerrar sesión para poder limpiar la cookie, sin caerse toda la página por esto.
  }

  return (
    <div className="flex items-center gap-2">
      {rol === "Admin" && (
        <Link href="/admin" aria-label="Ir a mi panel" className={CLASES_BOTON}>
          <LayoutDashboard size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      )}
      {rol === "Emprendedor" && (
        <Link href="/mi-negocio" aria-label="Ir a mi negocio" className={CLASES_BOTON}>
          <Store size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      )}
      <form action={cerrarSesionAction}>
        <button type="submit" aria-label="Cerrar sesión" className={CLASES_BOTON}>
          <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
