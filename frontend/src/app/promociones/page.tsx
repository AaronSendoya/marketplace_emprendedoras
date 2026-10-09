import { Percent } from "lucide-react";
import type { Metadata } from "next";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { Paginador } from "@/components/molecules/Paginador";
import { PromocionCard } from "@/components/molecules/PromocionCard";
import { BusquedaProvider, EncabezadoResultados, ResultadosBusqueda, SinResultadosBusqueda } from "@/components/organisms/BusquedaCatalogo";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { CatalogHeader } from "@/components/organisms/CatalogHeader";
import { CatalogToolbar } from "@/components/organisms/CatalogToolbar";
import { SelectorOrdenPromociones } from "@/components/organisms/SelectorOrdenPromociones";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { listarPromociones } from "@/lib/api/promociones";
import type { OrdenPromociones } from "@/lib/api/tipos";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { semillaDe } from "@/lib/inicio/semilla";

export const metadata: Metadata = {
  title: "Promociones — Track de Mujeres",
};

const LIMITE = 12;
const ORDENES: readonly OrdenPromociones[] = ["aleatorio", "mayor_descuento", "termina_pronto"];

// Un valor de searchParams puede llegar repetido (?q=a&q=b); nos quedamos con el primero, como
// hacen los ejemplos de Next para este mismo caso (string | string[] | undefined).
function primerValor(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

// Promociones (CLAUDE.md sección 6, regla 14, punto l): una tarjeta por descuento vigente de cada emprendedora (regla 23 del backend). Cada tarjeta lleva a
// los productos que tiene (`/promociones/[id]`). Los productos sueltos viven en `/productos`. Lo que dice cada tarjeta (vigencia, cuántos
// productos) llega resuelto del backend. Por defecto el orden es al azar y cambia en cada visita, con la misma semilla en la dirección mientras se pasa
// de página; «Mayor descuento» y «Termina pronto» no necesitan semilla.
export default async function PaginaPromociones({ searchParams }: PageProps<"/promociones">) {
  const parametros = await searchParams;
  // El backend acepta de 1 a 100 caracteres: un texto más largo, escrito a mano en la URL, no debe llegar a la API ni terminar en una página de error.
  const q = primerValor(parametros.q).trim().slice(0, 100);
  const ciudadId = primerValor(parametros.ciudad_id);
  const rubroId = primerValor(parametros.rubro_id);
  const pagina = Number(primerValor(parametros.pagina)) || 1;
  const pedido = primerValor(parametros.orden);
  const orden = (ORDENES as readonly string[]).includes(pedido) ? (pedido as OrdenPromociones) : "aleatorio";
  const semilla = orden === "aleatorio" ? semillaDe(primerValor(parametros.semilla)) : undefined;
  const hayFiltros = Boolean(q || ciudadId || rubroId);

  const [ciudades, rubros, { datos: promociones, paginacion }] = await Promise.all([
    listarCiudades(),
    listarRubros(),
    listarPromociones({
      q: q || undefined,
      ciudad_id: ciudadId || undefined,
      rubro_id: rubroId || undefined,
      pagina,
      limite: LIMITE,
      orden,
      semilla,
    }),
  ]);

  function crearHref(nuevaPagina: number): string {
    const parametrosUrl = new URLSearchParams();
    if (q) parametrosUrl.set("q", q);
    if (ciudadId) parametrosUrl.set("ciudad_id", ciudadId);
    if (rubroId) parametrosUrl.set("rubro_id", rubroId);
    if (orden !== "aleatorio") parametrosUrl.set("orden", orden);
    if (semilla) parametrosUrl.set("semilla", semilla);
    parametrosUrl.set("pagina", String(nuevaPagina));
    return `/promociones?${parametrosUrl.toString()}`;
  }

  return (
    <main className="flex-1">
      <CatalogHeader
        titulo="Promociones"
        descripcion="Descuentos vigentes de las emprendedoras. Elige uno para ver los productos que incluye."
        imagen="/Portada 2.png"
      />

      {/* Sin relleno arriba (`pt-0`): la barra de filtros se superpone al borde inferior del banner (regla 14). */}
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} space-y-8 px-4 pt-0 pb-16 sm:px-6 lg:px-8`}>
        <BusquedaProvider>
          <CatalogToolbar ciudades={ciudades} rubros={rubros} placeholderBusqueda="Buscar por negocio o texto de la promoción..." tono="purpura" />

          <ResultadosBusqueda className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <EncabezadoResultados total={paginacion.total} unidades={["promoción", "promociones"]} ciudades={ciudades} rubros={rubros} />
              {promociones.length > 0 && <SelectorOrdenPromociones orden={orden} />}
            </div>

            {promociones.length === 0 ? (
              hayFiltros ? (
                <SinResultadosBusqueda ruta="/promociones" plural="promociones" />
              ) : (
                <EstadoVacio
                  icono={Percent}
                  titulo="Todavía no hay promociones vigentes"
                  descripcion="Las promociones que creen las emprendedoras aparecen aquí. Mientras tanto, mira los productos de la comunidad."
                  accion={{ etiqueta: "Ver los productos", href: "/productos" }}
                  className="bg-superficie"
                />
              )
            ) : (
              <CatalogGrid>
                {promociones.map((promocion) => (
                  <PromocionCard key={promocion.id} promocion={promocion} />
                ))}
              </CatalogGrid>
            )}

            <Paginador paginacion={paginacion} crearHref={crearHref} superficie />
          </ResultadosBusqueda>
        </BusquedaProvider>
      </div>
    </main>
  );
}
