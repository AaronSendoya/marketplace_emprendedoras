import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/organisms/AdminSidebar";
import { obtenerMe } from "@/lib/api/auth";
import { ErrorApi } from "@/lib/api/cliente";
import { haySesion } from "@/lib/auth/sesion";

// Envuelve todas las rutas /admin/* (convención de layouts anidados de Next): sin cookie, redirige
// a iniciar sesión sin gastar una petición; con cookie, GET /auth/me confirma que el token sigue
// siendo válido y trae el rol de verdad (regla 5, backend: nunca del token). Solo Admin entra;
// una Emprendedora (sin panel propio todavía) vuelve a la Landing, no a un error.
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  if (!(await haySesion())) redirect("/iniciar-sesion");

  let usuario;
  try {
    usuario = await obtenerMe();
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401) redirect("/iniciar-sesion");
    throw error;
  }

  if (usuario.rol !== "Admin") redirect("/");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-fondo md:flex-row">
      <AdminSidebar nombreCompleto={usuario.nombre_completo} />
      <main className="min-w-0 flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
