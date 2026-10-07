import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { FondoFotografico } from "@/components/atoms/FondoFotografico";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

// Portada del Inicio: la foto del cliente sin filtro (CLAUDE.md sección 6, regla 10), el nombre del programa y un
// único llamado a la acción. El CTA es el único de la página con el naranja a tamaño grande. Esta foto es lo
// más grande y lo primero que se ve (el LCP): lleva `priority` y no se anima (regla 6); el título, la
// descripción y el botón entran uno tras otro con un ascenso corto.
//
// "Portada 1.png" mide 2732x590 px, igual que "Portada 2.png" (CatalogHeader). De 1024px de ancho (lg:) en adelante,
// el contenedor usa esa misma proporción exacta (aspect-[2732/590]): así object-cover no tiene que ampliar nada y se
// ve la foto completa, sin cortar los bordes laterales. Antes de eso (móvil y tablet) no alcanza el ancho para
// mostrarla completa sin dejar una franja demasiado baja para el texto, así que se recorta un poco.
export function Hero() {
  return (
    <section className="relative flex aspect-[3/2] w-full items-end overflow-hidden sm:aspect-[3/1] lg:aspect-[2732/590]">
      <FondoFotografico src="/Portada 1.png" priority />

      <div className={`relative mx-auto w-full ${CONTENEDOR_PUBLICO} space-y-3 px-4 py-6 sm:px-6 sm:py-8 lg:px-8`}>
        <h1 className="animate-entrada font-titulo text-3xl leading-tight font-extrabold text-white sm:text-4xl lg:text-[2.75rem]">Track de Mujeres</h1>
        <p className="max-w-xl animate-entrada font-cuerpo text-sm text-white/90 sm:text-base" style={{ animationDelay: "80ms" }}>
          Descubre negocios, conecta con sus creadoras y encuentra nuevas oportunidades dentro de la comunidad.
        </p>
        <div className="animate-entrada" style={{ animationDelay: "160ms" }}>
          <Link href="/emprendedoras" className={clasesBoton("primario", "", "grande")}>
            Explorar la comunidad
          </Link>
        </div>
      </div>
    </section>
  );
}
