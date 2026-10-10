"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/organisms/Footer";
import { Navbar } from "@/components/organisms/Navbar";

interface PropsSiteChrome {
  // Server Component (SesionNavIcono) ya renderizado desde layout.tsx, igual que Navbar lo recibe
  // hoy: este componente es Client solo por la ruta actual (usePathname), no necesita leer la
  // cookie él mismo.
  sesion: ReactNode;
  children: ReactNode;
}

// Los dos paneles (el del Admin, con su sidebar, en src/app/admin/layout.tsx; el de la Emprendedora,
// con su riel y su barra inferior, en src/app/mi-negocio/layout.tsx), la pantalla de iniciar
// sesión y la ventana de conexión con Google (`/conexion-google`, regla 22) son vistas aparte: ninguna lleva el Navbar ni el
// Footer públicos (pedido explícito).
// Sacar esta decisión del layout raíz a un Client Component evita reorganizar todas las rutas
// públicas en un grupo de Next solo para que estas no los hereden.
export function SiteChrome({ sesion, children }: PropsSiteChrome) {
  const pathname = usePathname();
  const esAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const esNegocio = pathname === "/mi-negocio" || pathname.startsWith("/mi-negocio/");
  const esLogin = pathname === "/iniciar-sesion";
  const esConexionGoogle = pathname === "/conexion-google";

  if (esAdmin || esNegocio || esLogin || esConexionGoogle) return <>{children}</>;

  return (
    <>
      <Navbar sesion={sesion} />
      {children}
      <Footer />
    </>
  );
}
