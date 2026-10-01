import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Catálogo Track de Mujeres 2026",
  description: "API del catálogo de emprendedoras. Documentación en /docs.",
};

// Next exige un layout raíz aunque el proyecto sea solo API (los Route Handlers
// no lo usan). Se mantiene vacío a propósito: el frontend vive en otro repositorio.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
