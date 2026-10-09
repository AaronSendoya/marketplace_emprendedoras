import { ArrowRight, Coffee, Factory, HeartPulse, Laptop, Palette, Scissors, ShoppingBag, Sparkles, Tag, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { FotoPrograma } from "@/components/atoms/FotoPrograma";
import type { Rubro } from "@/lib/api/tipos";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { cargarCatalogos, cargarEmprendedoras } from "@/lib/inicio/datos";
import { contarPor } from "@/lib/inicio/muestra";
import { EncabezadoSeccion } from "./EncabezadoSeccion";

interface VisualDeRubro {
  icono: LucideIcon;
  // Las dos fotos de `Portada 2.png` que corresponden a un rubro: la de las botellas a «Alimentos y bebidas» y la de los tejidos
  // (con su cartel «Artesanías y manualidades») a «Artesanías». Los demás rubros no tienen una foto que les corresponda y van como ficha.
  foto?: 0 | 1;
}

const sinTildes = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Por el nombre, no por el id: los 8 rubros oficiales (CLAUDE.md sección 3) tienen nombres fijos. Uno que no se reconoce
// (un rubro nuevo que agregue el cliente) cae en el icono genérico y en una ficha, nunca rompe la sección.
function visualDe(rubro: Rubro): VisualDeRubro {
  const nombre = sinTildes(rubro.nombre);
  if (nombre.includes("alimentos")) return { icono: Coffee, foto: 0 };
  if (nombre.includes("artesan")) return { icono: Palette, foto: 1 };
  if (nombre.includes("belleza")) return { icono: Sparkles };
  if (nombre.includes("comercio")) return { icono: ShoppingBag };
  if (nombre.includes("dise")) return { icono: Scissors };
  if (nombre.includes("manufactura")) return { icono: Factory };
  if (nombre.includes("salud")) return { icono: HeartPulse };
  if (nombre.includes("tecnolog")) return { icono: Laptop };
  return { icono: Tag };
}

const cuantos = (n: number) => (n === 0 ? "Aún sin negocios" : n === 1 ? "1 negocio" : `${n} negocios`);

// Un tono distinto por ficha, de las tres áreas de la identidad (naranja, rosa y lila tenues) y con el icono del mismo color, para que la cuadrícula
// no sea una sola mancha ni toda naranja (CLAUDE.md sección 6, regla 14, punto k). Cadenas completas para que Tailwind las encuentre.
const TONOS = [
  { ficha: "border-enfasis-borde bg-enfasis-suave", icono: "text-enfasis" },
  { ficha: "border-acento-borde bg-acento-suave", icono: "text-acento" },
  { ficha: "border-secundario-borde bg-secundario-suave", icono: "text-secundario" },
];

// «¿Qué tipos de negocio hay?» (CLAUDE.md sección 6, regla 14, punto k): los 8 rubros oficiales, que llevan al catálogo ya filtrado. Los
// dos que tienen foto van grandes; los otros, como fichas con icono. Cada uno dice cuántos negocios tiene (o que todavía no tiene).
export async function SeccionRubros() {
  const [{ rubros }, { elementos: perfiles }] = await Promise.all([cargarCatalogos(), cargarEmprendedoras()]);
  if (rubros.length === 0) return null;

  const conteo = contarPor(perfiles, (perfil) => perfil.rubro);
  const conVisual = rubros.map((rubro) => ({ rubro, ...visualDe(rubro) }));
  const conFoto = conVisual.filter((r) => r.foto !== undefined).sort((a, b) => (a.foto ?? 0) - (b.foto ?? 0));
  const fichas = conVisual.filter((r) => r.foto === undefined);
  // Si falta alguna de las dos fotos (un rubro renombrado), esa va como ficha: nunca una foto con un rótulo equivocado.
  const todas = conFoto.length === 2 ? { fotos: conFoto, fichas } : { fotos: [], fichas: [...conFoto, ...fichas] };

  return (
    <section aria-labelledby="inicio-rubros" className="border-y border-borde bg-superficie py-16 sm:py-20">
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} px-4 sm:px-6 lg:px-8`}>
        <EncabezadoSeccion id="inicio-rubros" eyebrow="Rubros" titulo="Explora por rubro" bajada="Elige un rubro y descubre los negocios que lo forman." tono="acento" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {todas.fotos.map(({ rubro, foto }) => (
            <Link
              key={rubro.id}
              href={`/emprendedoras?rubro_id=${rubro.id}`}
              className="group relative flex aspect-[16/9] items-end overflow-hidden rounded-superficie shadow-tarjeta outline-none transition-shadow hover:shadow-tarjeta-hover focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2 sm:col-span-2 sm:aspect-[16/7] lg:col-span-3"
            >
              <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none">
                <FotoPrograma tira="/Portada 2.png" foto={foto ?? 0} verticalPct={62} className="size-full" sizes="(min-width: 1024px) 1400px, 1000px" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-pie/90 via-pie/20 to-transparent" aria-hidden="true" />
              <div className="relative flex w-full items-end justify-between gap-3 p-5 text-white sm:p-6">
                <div className="min-w-0">
                  <h3 className="font-titulo text-xl leading-tight font-extrabold tracking-tight text-balance sm:text-[1.375rem]">{rubro.nombre}</h3>
                  <p className="mt-1 font-cuerpo text-sm text-pie-texto">{cuantos(conteo.get(rubro.id) ?? 0)}</p>
                </div>
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-texto transition-[translate,background-color] duration-200 group-hover:translate-x-1 group-hover:bg-pie-acento motion-reduce:transition-none">
                  <ArrowRight size={18} strokeWidth={2} />
                </span>
              </div>
            </Link>
          ))}

          {todas.fichas.map(({ rubro, icono: Icono }, indice) => {
            const tono = TONOS[indice % TONOS.length];
            return (
            <Link
              key={rubro.id}
              href={`/emprendedoras?rubro_id=${rubro.id}`}
              className={`group flex items-center gap-4 rounded-superficie border p-4 outline-none transition-[background-color,border-color,translate,color] duration-200 hover:-translate-y-0.5 hover:border-pie hover:bg-pie hover:text-white focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2 motion-reduce:transition-none sm:p-[1.125rem] lg:col-span-2 ${tono.ficha}`}
            >
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl border border-texto/5 bg-superficie transition-colors duration-200 group-hover:bg-pie-acento group-hover:text-pie ${tono.icono}`}>
                <Icono size={24} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-titulo text-base leading-tight font-bold text-balance">{rubro.nombre}</span>
                <span className="mt-0.5 block font-cuerpo text-sm text-texto-secundario transition-colors group-hover:text-pie-tenue">{cuantos(conteo.get(rubro.id) ?? 0)}</span>
              </span>
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-texto-secundario transition-[translate,color] duration-200 group-hover:translate-x-1 group-hover:text-pie-acento motion-reduce:transition-none" />
            </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
