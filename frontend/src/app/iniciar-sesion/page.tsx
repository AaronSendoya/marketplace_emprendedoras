import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FormularioIniciarSesion } from "@/components/organisms/FormularioIniciarSesion";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

export const metadata: Metadata = {
  title: "Iniciar sesión — Track de Mujeres",
};

// Vista aparte, sin el Navbar ni el Footer públicos (ver SiteChrome): quien llega acá ya sabe qué
// busca, así que la pantalla completa se dedica al formulario, no a la navegación del catálogo.
// Layout dividido desde `lg` (revisado 2026-10-01): la mitad derecha reutiliza la foto real del
// Hero ("Portada 1.png", regla 10 — nunca una foto de stock nueva ni un degradado decorativo, que
// la sección 6 prohíbe) en vez de dejar la tarjeta blanca sola sobre un fondo igual de claro.
export default function PaginaIniciarSesion() {
  return (
    <main className="flex min-h-screen flex-1">
      <div className="flex w-full flex-col items-center justify-center bg-fondo px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          {/* Solo la marca, no un enlace (mismo criterio que Navbar): "Volver al catálogo" de abajo
              es la navegación explícita. */}
          <Image src="/logo/pista8-logo.png" alt="Pista 8" width={584} height={185} className="mx-auto h-10 w-auto" priority />

          <div className="space-y-6 rounded-xl border border-borde bg-superficie p-8 shadow-sm">
            <div className="space-y-1 text-center">
              <h1 className="font-titulo text-xl font-bold text-texto">Iniciar sesión</h1>
              <p className="font-cuerpo text-sm text-texto-secundario">Acceso para emprendedoras y administradoras.</p>
            </div>

            <FormularioIniciarSesion />
          </div>

          <Link
            href="/"
            className={`flex items-center justify-center gap-2 font-cuerpo text-sm text-texto-secundario transition-colors hover:text-acento ${CLASES_FOCO_ENLACE}`}
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Volver al catálogo
          </Link>
        </div>
      </div>

      <div className="hidden flex-1 flex-col items-center justify-center gap-6 bg-acento-suave p-12 lg:flex">
        <Image src="/Portada 1.png" alt="" width={2732} height={590} className="w-full max-w-xl rounded-xl" />
        <p className="max-w-md text-center font-cuerpo text-sm text-texto-secundario">
          Una comunidad de emprendedoras que impulsa sus negocios en todo el país.
        </p>
      </div>
    </main>
  );
}
