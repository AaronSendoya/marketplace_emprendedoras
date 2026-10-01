import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { FondoFotografico } from "@/components/atoms/FondoFotografico";

// "Portada 1.png" mide 2732x590 px, igual que "Portada 2.png" (CatalogHeader). De 1024px de
// ancho (lg:) en adelante, el contenedor usa esa misma proporción exacta (aspect-[2732/590]): así
// object-cover no tiene que ampliar nada y se ve la foto completa, sin cortar los bordes
// laterales. Antes de eso (móvil y tablet) no alcanza el ancho para mostrarla completa sin dejar
// una franja demasiado baja para el texto, así que se recorta un poco menos agresivamente que
// antes, pero recorta al fin.
export function Hero() {
  return (
    <section className="relative flex aspect-[3/2] w-full items-end overflow-hidden sm:aspect-[3/1] lg:aspect-[2732/590]">
      <FondoFotografico src="/Portada 1.png" priority />

      <div className="relative mx-auto w-full max-w-6xl space-y-3 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-titulo text-3xl font-extrabold text-white sm:text-4xl">Track de Mujeres</h1>
        <p className="max-w-xl font-cuerpo text-sm text-white/90 sm:text-base">
          Descubre negocios, conecta con sus creadoras y encuentra nuevas oportunidades dentro de la comunidad.
        </p>
        <Link href="/emprendedoras" className={clasesBoton("primario")}>
          Explorar la comunidad
        </Link>
      </div>
    </section>
  );
}
