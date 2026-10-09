import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { EncabezadoSeccion } from "./EncabezadoSeccion";

// Cuatro pasos que sí son una secuencia (CLAUDE.md sección 6, regla 14, punto k): por eso van numerados y unidos por una línea. Es la franja
// de cuatro ventajas de siempre (catálogo real, contacto directo, promociones, búsqueda por ciudad y rubro) dicha en el orden en que
// una persona la vive. Cada paso lleva el color de su área (magenta: emprendedoras; naranja: productos; púrpura: promociones; ciruela:
// contacto), para que el naranja no lo sea todo. Cadenas completas para que Tailwind las encuentre. Sin datos: es texto fijo.
const PASOS = [
  { titulo: "Descubre negocios reales", texto: "Recorre el catálogo de emprendedoras de la comunidad.", circulo: "border-acento bg-acento-suave text-acento" },
  { titulo: "Conoce sus productos", texto: "Mira lo que ofrece cada negocio, con fotos y precios.", circulo: "border-marca bg-enfasis-suave text-enfasis" },
  { titulo: "Encuentra promociones", texto: "Aprovecha los descuentos que cada negocio tiene vigentes.", circulo: "border-secundario bg-secundario-suave text-secundario" },
  { titulo: "Contacta directamente", texto: "Escribe por WhatsApp o Instagram a quien te interesa, sin intermediarios.", circulo: "border-pie bg-pie text-white" },
];

export function ComoFunciona() {
  return (
    <section aria-labelledby="inicio-como-funciona" className="border-y border-borde bg-superficie py-16 sm:py-20">
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} px-4 sm:px-6 lg:px-8`}>
        <EncabezadoSeccion id="inicio-como-funciona" eyebrow="Cómo funciona" titulo="De descubrir a escribirle a la emprendedora, en cuatro pasos" tono="acento" />

        <ol className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {PASOS.map((paso, indice) => (
            <li key={paso.titulo} className="relative flex gap-4 lg:block lg:pr-8">
              <span className={`relative z-10 flex size-[3.25rem] shrink-0 items-center justify-center rounded-full border-2 font-titulo text-xl font-extrabold ${paso.circulo}`}>{indice + 1}</span>
              {/* La línea que une un paso con el siguiente: solo en una fila (desde `lg`) y no tras el último. */}
              {indice < PASOS.length - 1 && <span aria-hidden="true" className="absolute top-[1.5rem] right-2 left-[4.25rem] hidden border-t-2 border-dashed border-borde-fuerte lg:block" />}
              <div>
                <h3 className="font-titulo text-lg leading-tight font-extrabold tracking-tight text-texto lg:mt-5">{paso.titulo}</h3>
                <p className="mt-2 font-cuerpo text-[0.9375rem] text-pretty text-texto-secundario">{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
