import type { Metadata } from "next";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";

export const metadata: Metadata = { title: "Promoción no encontrada — Track de Mujeres" };

export default function PromocionNoEncontrada() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-titulo text-xl font-bold text-texto">Promoción no encontrada</h1>
      <p className="max-w-sm font-cuerpo text-sm text-texto-secundario">Esta promoción no existe o ya no está vigente.</p>
      <Link href="/promociones" className={clasesBoton("descuento")}>
        Ver las promociones vigentes
      </Link>
    </main>
  );
}
