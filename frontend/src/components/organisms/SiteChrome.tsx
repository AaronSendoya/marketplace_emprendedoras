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

// El panel del Admin (con su propio layout de sidebar, src/app/admin/layout.tsx) y la pantalla de
// iniciar sesión son vistas aparte: ninguna de las dos lleva el Navbar ni el Footer públicos
// (pedido explícito). Sacar esta decisión del layout raíz a un Client Component evita reorganizar
// todas las rutas públicas en un grupo de Next solo para que estas dos no los hereden.
export function SiteChrome({ sesion, children }: PropsSiteChrome) {
  const pathname = usePathname();
  const esAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const esLogin = pathname === "/iniciar-sesion";

  if (esAdmin || esLogin) return <>{children}</>;

  return (
    <>
      <Navbar sesion={sesion} />
      {children}
      <Footer />
    </>
  );
}
