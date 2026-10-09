import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { FotoPrograma } from "@/components/atoms/FotoPrograma";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

// Pieza del mosaico: un recuadro con la proporción de una foto de la tira (910 x 590) y su filete del color del fondo, para
// que al superponerse se lean como piezas separadas.
const PIEZA = "absolute aspect-[910/590] overflow-hidden rounded-superficie border-[5px] border-pie shadow-[0_18px_40px_rgb(10_3_8/0.45)] transition-[translate] duration-500 motion-reduce:transition-none";

// Portada del Inicio (CLAUDE.md sección 6, regla 14, punto k): fondo ciruela, el mensaje a la izquierda y, a la derecha, las tres
// fotos de `Portada 1.png` recompuestas en un mosaico en vez de una tira a todo lo ancho. Responde a «¿qué es PISTA8?» con el
// titular y la bajada, y a «¿qué puedo hacer?» con las dos acciones. Sin datos del backend: pinta de inmediato. El mosaico es lo que
// más pesa y lo primero que se ve (el LCP): la primera foto lleva `priority` y no se anima (regla 6); el texto entra uno tras otro.
// La tercera foto se acerca y se ancla abajo para dejar fuera el rótulo «Track de Mujeres» que trae la imagen (el titular ya lo dice).
// El fondo se extiende por debajo para alojar la mitad superior de la tarjeta de entrada al catálogo, que se superpone a su borde.
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-pie pt-10 pb-28 text-white sm:pt-14 sm:pb-32 lg:pb-36">
      <div className={`mx-auto grid w-full ${CONTENEDOR_PUBLICO} items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:px-8`}>
        <div>
          <p className="animate-entrada font-cuerpo text-xs font-semibold tracking-[0.12em] text-pie-tenue uppercase">Catálogo de emprendedoras</p>
          <h1 className="mt-4 animate-entrada font-titulo text-[2.125rem] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]" style={{ animationDelay: "60ms" }}>
            Descubre los negocios de la comunidad <span className="text-pie-rosa">Track de Mujeres</span>
          </h1>
          <p className="mt-5 max-w-[34rem] animate-entrada font-cuerpo text-base text-pie-texto text-pretty sm:text-lg" style={{ animationDelay: "120ms" }}>
            Conoce a las emprendedoras, explora sus productos, encuentra promociones y contáctalas directo.
          </p>
          <div className="mt-8 flex animate-entrada flex-col gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
            <Link href="/emprendedoras" className={clasesBoton("primario", "gap-2", "grande")}>
              Explorar la comunidad
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link
              href="/promociones"
              className={clasesBoton("contorno", "border-white/45 bg-transparent text-white hover:border-white hover:bg-white/10 focus-visible:ring-offset-pie", "grande")}
            >
              Ver promociones
            </Link>
          </div>
        </div>

        <div className="relative aspect-[1.12/1] w-full max-w-[35rem] animate-entrada justify-self-center lg:max-w-none" style={{ animationDelay: "120ms" }} aria-hidden="true">
          <div className={`${PIEZA} top-0 left-0 w-[72%] border-0`}>
            <FotoPrograma tira="/Portada 1.png" foto={0} priority className="size-full" sizes="(min-width: 1024px) 1200px, 900px" />
          </div>
          <div className={`${PIEZA} top-[30%] right-0 w-[53%]`}>
            <FotoPrograma tira="/Portada 1.png" foto={1} className="size-full" sizes="(min-width: 1024px) 1200px, 900px" />
          </div>
          <div className={`${PIEZA} bottom-0 left-[13%] w-[44%]`}>
            <FotoPrograma tira="/Portada 1.png" foto={2} acercamiento={1.37} className="size-full" sizes="(min-width: 1024px) 1200px, 900px" />
          </div>
        </div>
      </div>
    </section>
  );
}
