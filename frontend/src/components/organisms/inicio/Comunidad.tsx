import Image from "next/image";
import { FotoPrograma } from "@/components/atoms/FotoPrograma";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

const VALORES = [
  { titulo: "Descubrimiento", texto: "Encuentra negocios que no sabías que existían." },
  { titulo: "Conexión", texto: "Habla directo con quien hace el producto." },
  { titulo: "Oportunidades", texto: "Cada visita puede ser un cliente nuevo para ellas." },
];

// «¿Quién hay detrás?» (CLAUDE.md sección 6, regla 14, punto k): la comunidad Track de Mujeres, con el logo del programa, tres de las fotos de
// `Portada 2.png` recompuestas y un texto breve que solo dice lo que el sitio ya dice. En una banda de rosa tenue. Sin datos: es texto
// fijo. El logo es un archivo local de PISTA8: una de las excepciones a `ImagenR2` (regla 16).
export function Comunidad() {
  return (
    <section aria-labelledby="inicio-comunidad" className="border-y border-acento-borde bg-acento-suave py-16 sm:py-20">
      <div className={`mx-auto grid w-full ${CONTENEDOR_PUBLICO} items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8`}>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1.15fr_1fr]" aria-hidden="true">
          <div className="aspect-[910/590] sm:row-span-2 sm:aspect-auto sm:min-h-[22rem]">
            <FotoPrograma tira="/Portada 2.png" foto={0} ajuste="alto" className="size-full rounded-superficie shadow-tarjeta" sizes="(min-width: 1024px) 1400px, 1000px" />
          </div>
          <FotoPrograma tira="/Portada 2.png" foto={1} className="aspect-[910/590] rounded-superficie shadow-tarjeta" sizes="(min-width: 1024px) 1400px, 1000px" />
          <FotoPrograma tira="/Portada 2.png" foto={2} verticalPct={70} className="aspect-[910/590] rounded-superficie shadow-tarjeta" sizes="(min-width: 1024px) 1400px, 1000px" />
        </div>

        <div>
          <Image src="/logo/TDM-logo-fondo-claro.png" alt="Track de Mujeres" width={1024} height={256} className="mb-6 h-10 w-auto sm:h-12" />
          <p className="font-cuerpo text-xs font-semibold tracking-[0.12em] text-acento uppercase">Comunidad</p>
          <h2 id="inicio-comunidad" className="mt-2.5 font-titulo text-[1.625rem] leading-tight font-extrabold tracking-tight text-balance text-texto sm:text-[2rem]">
            Emprendedoras que crecen juntas
          </h2>
          <p className="mt-3 max-w-xl font-cuerpo text-base text-pretty text-texto-secundario">
            Track de Mujeres reúne a emprendedoras de distintas ciudades y rubros. PISTA8 muestra sus negocios en un solo lugar para que más personas los conozcan, les compren y las contacten.
          </p>
          <ul className="mt-7 space-y-4">
            {VALORES.map((valor) => (
              <li key={valor.titulo} className="flex gap-3.5">
                <span aria-hidden="true" className="mt-[0.5625rem] size-2 shrink-0 rounded-full bg-acento" />
                <div>
                  <p className="font-titulo text-base font-bold text-texto">{valor.titulo}</p>
                  <p className="font-cuerpo text-[0.9375rem] text-texto-secundario">{valor.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
