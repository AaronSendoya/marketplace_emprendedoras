import { ChevronDown, MapPin, Search, Tag } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { clasesBoton } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { cargarCatalogos, cargarEmprendedoras, MINIMO_PARA_CIFRAS } from "@/lib/inicio/datos";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import type { ReferenciaCatalogo } from "@/lib/api/tipos";

// Un campo de la entrada: el icono delante, el control y (en los selectores) la flecha propia, como en la barra de filtros de los
// catálogos (CLAUDE.md sección 6, regla 14, punto c). La etiqueta existe para los lectores de pantalla.
function CampoConIcono({ id, etiqueta, icono, flecha = false, children }: { id: string; etiqueta: string; icono: ReactNode; flecha?: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-texto-secundario">
        {icono}
      </span>
      {children}
      {flecha && <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-texto-secundario" />}
    </div>
  );
}

function Selector({ id, nombre, etiqueta, todas, opciones, icono }: { id: string; nombre: string; etiqueta: string; todas: string; opciones: readonly ReferenciaCatalogo[]; icono: ReactNode }) {
  return (
    <CampoConIcono id={id} etiqueta={etiqueta} icono={icono} flecha>
      <Select id={id} name={nombre} variante="catalogo" defaultValue="">
        <option value="">{todas}</option>
        {opciones.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {opcion.nombre}
          </option>
        ))}
      </Select>
    </CampoConIcono>
  );
}

// Las ciudades y los rubros reales. Mientras llegan, los mismos dos campos con solo su opción «todas», del mismo tamaño: nada se mueve.
async function Selectores() {
  const { ciudades, rubros } = await cargarCatalogos();
  return (
    <>
      <Selector id="inicio-ciudad" nombre="ciudad_id" etiqueta="Ciudad" todas="Todas las ciudades" opciones={ciudades} icono={<MapPin size={18} strokeWidth={1.75} />} />
      <Selector id="inicio-rubro" nombre="rubro_id" etiqueta="Rubro" todas="Todos los rubros" opciones={rubros} icono={<Tag size={18} strokeWidth={1.75} />} />
    </>
  );
}

function SelectoresMientrasLlegan() {
  return (
    <>
      <Selector id="inicio-ciudad" nombre="ciudad_id" etiqueta="Ciudad" todas="Todas las ciudades" opciones={[]} icono={<MapPin size={18} strokeWidth={1.75} />} />
      <Selector id="inicio-rubro" nombre="rubro_id" etiqueta="Rubro" todas="Todos los rubros" opciones={[]} icono={<Tag size={18} strokeWidth={1.75} />} />
    </>
  );
}

// «Hoy hay 86 emprendimientos»: solo desde 10 (regla 14, punto k): con menos, la cifra resta credibilidad. Va al final de la bajada.
async function CifraDelCatalogo() {
  const { total } = await cargarEmprendedoras();
  return total >= MINIMO_PARA_CIFRAS ? <> Hoy hay {total} emprendimientos en el catálogo.</> : null;
}

// «Encuentra lo que buscas» (CLAUDE.md sección 6, regla 14, punto k): la puerta de entrada al catálogo, una tarjeta que se superpone al
// borde del banner. No es un buscador nuevo: es un formulario `GET` sin JavaScript que abre `/emprendedoras` o `/productos`
// (que ya leen `q`, `ciudad_id` y `rubro_id`) con lo escrito. Dos botones, cada uno con su destino (`formAction`). Un campo vacío
// viaja como parámetro vacío y esas páginas lo toman como «sin filtro».
export function EntradaCatalogo() {
  return (
    <div className="relative z-10 -mt-20 sm:-mt-24">
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} px-4 sm:px-6 lg:px-8`}>
        <form action="/emprendedoras" method="get" aria-labelledby="inicio-entrada-titulo" className="rounded-superficie border border-borde bg-superficie p-5 shadow-modal sm:p-7">
          <h2 id="inicio-entrada-titulo" className="font-titulo text-xl font-extrabold tracking-tight text-texto sm:text-[1.375rem]">
            Encuentra lo que buscas
          </h2>
          <p className="mt-1 font-cuerpo text-sm text-texto-secundario">
            Escribe un negocio o un producto, o elige una ciudad y un rubro.
            <Suspense fallback={null}>
              <CifraDelCatalogo />
            </Suspense>
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]">
            {/* En dos columnas (tablet) el texto ocupa la fila de arriba y los dos selectores comparten la de abajo: así «Todas las ciudades» no se corta. */}
            <div className="md:col-span-2 lg:col-span-1">
              <CampoConIcono id="inicio-q" etiqueta="Negocio o producto" icono={<Search size={18} strokeWidth={1.75} />}>
                <Input id="inicio-q" name="q" type="search" variante="catalogo" maxLength={100} placeholder="Busca un negocio o un producto" autoComplete="off" />
              </CampoConIcono>
            </div>
            <Suspense fallback={<SelectoresMientrasLlegan />}>
              <Selectores />
            </Suspense>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="submit" className={clasesBoton("primario", "", "grande")}>
              Ver emprendedoras
            </button>
            <button type="submit" formAction="/productos" className={clasesBoton("contorno", "", "grande")}>
              Ver productos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
