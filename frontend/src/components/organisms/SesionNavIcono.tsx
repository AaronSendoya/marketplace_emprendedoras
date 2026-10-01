import { LayoutDashboard, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { cerrarSesionAction } from "@/lib/auth/acciones";
import { obtenerMe } from "@/lib/api/auth";
import { haySesion } from "@/lib/auth/sesion";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

const CLASES_BOTON = `rounded-md p-2 text-texto-secundario transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`;

// Server Component: se renderiza en el servidor (con acceso a la cookie de sesión, regla 5) y se
// pasa como children/prop al Navbar (Client Component) — así el Navbar no necesita convertirse en
// async ni leer cookies él mismo. Sin sesión, un solo ícono para entrar, sin texto ni color de
// marca: no se lee como invitación para un visitante casual, pero quien ya sabe qué busca lo
// reconoce (aria-label). Con sesión, un segundo ícono "ir a mi panel" solo para Admin (pedido
// explícito 2026-10-01: son dos acciones distintas, no una repetición como el CTA que ya
// corregimos) — la Emprendedora no tiene panel propio todavía, así que solo ve el de cerrar
// sesión.
export async function SesionNavIcono() {
  const sesionActiva = await haySesion();

  if (!sesionActiva) {
    return (
      <Link href="/iniciar-sesion" aria-label="Iniciar sesión" className={CLASES_BOTON}>
        <LogIn size={20} strokeWidth={1.5} aria-hidden="true" />
      </Link>
    );
  }

  let esAdmin = false;
  try {
    const yo = await obtenerMe();
    esAdmin = yo.rol === "Admin";
  } catch {
    // Cookie presente pero token inválido o vencido (ej. el Admin tras 24 h): se sigue mostrando
    // el botón de cerrar sesión para poder limpiar la cookie, sin caerse toda la página por esto.
  }

  return (
    <div className="flex items-center gap-1">
      {esAdmin && (
        <Link href="/admin" aria-label="Ir a mi panel" className={CLASES_BOTON}>
          <LayoutDashboard size={20} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      )}
      <form action={cerrarSesionAction}>
        <button type="submit" aria-label="Cerrar sesión" className={CLASES_BOTON}>
          <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
