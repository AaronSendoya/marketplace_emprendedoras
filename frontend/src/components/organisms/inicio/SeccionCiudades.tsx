import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { cargarCatalogos, cargarEmprendedoras } from "@/lib/inicio/datos";
import { contarPor } from "@/lib/inicio/muestra";

// «¿Dónde?» (CLAUDE.md sección 6, regla 14, punto k): solo las ciudades que ya tienen al menos un negocio publicado (una ciudad del
// catálogo sin negocios llevaría a una página vacía), de más a menos negocios y, a igual cantidad, por nombre. Cada una lleva al
// catálogo filtrado por ella. Sin ninguna, la sección no se dibuja. Con una sola, el texto de la izquierda evita que parezca perdida.
export async function SeccionCiudades() {
  const [{ ciudades }, { elementos: perfiles }] = await Promise.all([cargarCatalogos(), cargarEmprendedoras()]);
  const conteo = contarPor(perfiles, (perfil) => perfil.ciudad);
  const conNegocios = ciudades
    .map((ciudad) => ({ ciudad, negocios: conteo.get(ciudad.id) ?? 0 }))
    .filter((item) => item.negocios > 0)
    .sort((a, b) => b.negocios - a.negocios || a.ciudad.nombre.localeCompare(b.ciudad.nombre, "es"));
  if (conNegocios.length === 0) return null;

  return (
    <section aria-labelledby="inicio-ciudades" className="py-16 sm:py-20">
      <div className={`mx-auto grid w-full ${CONTENEDOR_PUBLICO} gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14 lg:px-8`}>
        <div>
          <p className="font-cuerpo text-xs font-semibold tracking-[0.12em] text-acento uppercase">Ciudades</p>
          <h2 id="inicio-ciudades" className="mt-2.5 font-titulo text-[1.625rem] leading-tight font-extrabold tracking-tight text-balance text-texto sm:text-[2rem]">
            Encuentra negocios en tu ciudad
          </h2>
          <p className="mt-2.5 max-w-sm font-cuerpo text-base text-pretty text-texto-secundario">Elige una ciudad para ver las emprendedoras que están ahí.</p>
        </div>

        <div className="flex flex-wrap content-start gap-4">
          {conNegocios.map(({ ciudad, negocios }) => (
            <Link
              key={ciudad.id}
              href={`/emprendedoras?ciudad_id=${ciudad.id}`}
              className="group flex min-w-[14rem] flex-1 basis-[14rem] items-center gap-4 rounded-superficie border border-borde bg-superficie p-4 shadow-tarjeta outline-none transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-acento hover:shadow-tarjeta-hover focus-visible:ring-2 focus-visible:ring-foco focus-visible:ring-offset-2 motion-reduce:transition-none sm:max-w-[20rem]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-acento-borde bg-acento-suave text-acento">
                <MapPin size={22} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-titulo text-lg leading-tight font-extrabold text-texto">{ciudad.nombre}</span>
                <span className="block font-cuerpo text-sm text-texto-secundario">{negocios === 1 ? "1 emprendimiento" : `${negocios} emprendimientos`}</span>
              </span>
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-texto-secundario transition-[translate,color] duration-200 group-hover:translate-x-1 group-hover:text-acento motion-reduce:transition-none" />
            </Link>
          ))}
          <p className="basis-full font-cuerpo text-sm text-texto-secundario">Aparecen las ciudades que ya tienen al menos un negocio publicado.</p>
        </div>
      </div>
    </section>
  );
}
