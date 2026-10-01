import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SesionNavIcono } from "@/components/organisms/SesionNavIcono";
import { SiteChrome } from "@/components/organisms/SiteChrome";
import "./globals.css";

// CLAUDE.md sección 6, regla 3: dos familias con rol fijo, cada una vía next/font/google.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Track de Mujeres",
  description: "Catálogo de emprendedoras y sus promociones — Track de Mujeres.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${plusJakartaSans.variable} ${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col font-cuerpo antialiased">
        <SiteChrome sesion={<SesionNavIcono />}>{children}</SiteChrome>
      </body>
    </html>
  );
}
