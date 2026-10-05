import { redirect } from "next/navigation";
import { BarraInferiorNegocio } from "@/components/organisms/negocio/BarraInferiorNegocio";
import { CabeceraMovilNegocio } from "@/components/organisms/negocio/CabeceraMovilNegocio";
import { RielNegocio } from "@/components/organisms/negocio/RielNegocio";
import { obtenerMe } from "@/lib/api/auth";
import { ErrorApi } from "@/lib/api/cliente";
import { haySesion } from "@/lib/auth/sesion";
import { cargarPerfil } from "@/lib/negocio/datos";

// Envuelve todas las rutas /mi-negocio/* (el panel de la Emprendedora). Mismo guard que /admin: sin
// cookie, a iniciar sesión sin gastar una petición; con cookie, GET /auth/me confirma el token y
// trae el rol de verdad (regla 5, backend: nunca del token). Solo entra la Emprendedora; un Admin
// vuelve a su panel y cualquier otro caso a la Landing, no a un error.
export default async function LayoutNegocio({ children }: LayoutProps<"/mi-negocio">) {
  if (!(await haySesion())) redirect("/iniciar-sesion");

  let usuario;
  try {
    usuario = await obtenerMe();
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 401) redirect("/iniciar-sesion");
    throw error;
  }

  if (usuario.rol !== "Emprendedor") redirect(usuario.rol === "Admin" ? "/admin" : "/");

  const perfil = await cargarPerfil();
  const negocio = perfil ? { nombre: perfil.nombre_negocio, logoUrl: perfil.logo_url, paginaPublica: `/emprendedoras/${perfil.id}` } : null;

  // `tema-negocio` (globals.css) solo cambia tres variables de color para este panel: fondo arena y
  // el naranja del CTA en la versión que cumple contraste con texto blanco (sección 6, regla 11).
  return (
    <div className="tema-negocio flex min-h-full flex-1 flex-col bg-fondo lg:flex-row">
      <RielNegocio negocio={negocio} nombrePersona={usuario.nombre_completo} />
      <CabeceraMovilNegocio negocio={negocio} nombrePersona={usuario.nombre_completo} />
      {/* pb-28: la barra inferior (fija, debajo de `lg`) no tapa el final de la pantalla. */}
      <main className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-12 lg:pt-10 lg:pb-16">
        <div className="mx-auto w-full max-w-[60rem]">{children}</div>
      </main>
      <BarraInferiorNegocio tienePerfil={negocio !== null} />
    </div>
  );
}
