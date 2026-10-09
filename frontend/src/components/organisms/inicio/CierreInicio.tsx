import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clasesBoton } from "@/components/atoms/Button";
import { FotoPrograma } from "@/components/atoms/FotoPrograma";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

// El cierre (CLAUDE.md sección 6, regla 14, punto k): una última oportunidad de entrar al catálogo, con una jerarquía clara entre las dos
// acciones (la naranja, «Explorar emprendedoras», y la de contorno, «Ver promociones») y una de las fotos del programa que se funde con
// la tarjeta. Una tarjeta con margen y no una banda de lado a lado, para que no se pegue al pie, que también es ciruela.
export function CierreInicio() {
  return (
    <section aria-labelledby="inicio-cierre" className="py-16 sm:py-20">
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} px-4 sm:px-6 lg:px-8`}>
        <div className="relative grid overflow-hidden rounded-[1.25rem] bg-pie text-white shadow-modal lg:grid-cols-[1.1fr_1fr]">
          <div className="relative z-10 flex flex-col justify-center gap-4 px-6 py-10 sm:px-10 sm:py-14 lg:px-12">
            <h2 id="inicio-cierre" className="font-titulo text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">
              Empieza a descubrir
            </h2>
            <p className="max-w-md font-cuerpo text-base text-pie-texto sm:text-lg">Recorre el catálogo completo o mira qué promociones hay hoy.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Link href="/emprendedoras" className={clasesBoton("primario", "gap-2", "grande")}>
                Explorar emprendedoras
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

          <div className="relative order-first min-h-[12rem] lg:order-none lg:min-h-0" aria-hidden="true">
            <FotoPrograma tira="/Portada 1.png" foto={0} className="absolute inset-0 size-full" sizes="(min-width: 1024px) 900px, 1000px" />
            {/* El degradado funde la foto con el fondo de la tarjeta: hacia el texto en escritorio y hacia abajo en móvil. */}
            <div className="absolute inset-0 bg-gradient-to-t from-pie via-pie/30 to-transparent lg:bg-gradient-to-r lg:from-pie lg:via-pie/25 lg:to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
