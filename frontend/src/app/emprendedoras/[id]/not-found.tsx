import type { Metadata } from "next";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";

export const metadata: Metadata = { title: "Emprendedora no encontrada — Track de Mujeres" };

export default function PerfilNoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-titulo text-xl font-bold text-texto">Emprendedora no encontrada</h1>
      <p className="max-w-sm font-cuerpo text-sm text-texto-secundario">
        Este perfil no existe o ya no está disponible.
      </p>
      <Link href="/emprendedoras" className={clasesBoton("primario")}>
        Volver a emprendedoras
      </Link>
    </main>
  );
}
