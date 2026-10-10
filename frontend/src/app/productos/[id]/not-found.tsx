import type { Metadata } from "next";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";

export const metadata: Metadata = { title: "Producto no encontrado — Track de Mujeres" };

export default function ProductoNoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-titulo text-xl font-bold text-texto">Producto no encontrado</h1>
      <p className="max-w-sm font-cuerpo text-sm text-texto-secundario">
        Este producto no existe o ya no está disponible.
      </p>
      <Link href="/productos" className={clasesBoton("primario")}>
        Volver a productos
      </Link>
    </main>
  );
}
