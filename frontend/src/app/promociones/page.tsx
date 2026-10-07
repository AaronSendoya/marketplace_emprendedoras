import { Package } from "lucide-react";
import type { Metadata } from "next";
import { BusquedaProvider, EncabezadoResultados, ResultadosBusqueda, SinResultadosBusqueda } from "@/components/organisms/BusquedaCatalogo";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { CatalogHeader } from "@/components/organisms/CatalogHeader";
import { CatalogToolbar } from "@/components/organisms/CatalogToolbar";
import { AvisoResultadosSimilares } from "@/components/molecules/AvisoResultadosSimilares";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { ProductoCard } from "@/components/molecules/ProductoCard";
import { Paginador } from "@/components/molecules/Paginador";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { listarProductos } from "@/lib/api/productos";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";

export const metadata: Metadata = {
  title: "Promociones — Track de Mujeres",
};

const LIMITE = 12;

// Un valor de searchParams puede llegar repetido (?q=a&q=b); nos quedamos con el primero, como
// hacen los ejemplos de Next para este mismo caso (string | string[] | undefined).
function primerValor(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

// Feed 2 completo (sección 0 del plan): no filtra por "tiene descuento", porque el backend ya
// resuelve las tres presentaciones posibles de cada producto (precio normal, con descuento
// vigente o "Consultar precio", sección 5.2) y esta página solo las muestra tal cual llegan.
export default async function PaginaPromociones({ searchParams }: PageProps<"/promociones">) {
  const parametros = await searchParams;
  // El backend acepta de 1 a 100 caracteres (regla 21): un texto más largo, escrito a mano en la URL, no debe llegar
  // a la API ni terminar en una página de error.
  const q = primerValor(parametros.q).trim().slice(0, 100);
  const ciudadId = primerValor(parametros.ciudad_id);
  const rubroId = primerValor(parametros.rubro_id);
  const pagina = Number(primerValor(parametros.pagina)) || 1;
  const hayFiltros = Boolean(q || ciudadId || rubroId);

  const [ciudades, rubros, { datos: productos, paginacion, similares }] = await Promise.all([
    listarCiudades(),
    listarRubros(),
    listarProductos({
      q: q || undefined,
      ciudad_id: ciudadId || undefined,
      rubro_id: rubroId || undefined,
      pagina,
      limite: LIMITE,
    }),
  ]);

  function crearHref(nuevaPagina: number): string {
    const parametrosUrl = new URLSearchParams();
    if (q) parametrosUrl.set("q", q);
    if (ciudadId) parametrosUrl.set("ciudad_id", ciudadId);
    if (rubroId) parametrosUrl.set("rubro_id", rubroId);
    parametrosUrl.set("pagina", String(nuevaPagina));
    return `/promociones?${parametrosUrl.toString()}`;
  }

  return (
    <main className="flex-1">
      <CatalogHeader
        titulo="Promociones"
        descripcion="Productos de la comunidad Track de Mujeres, con sus descuentos vigentes cuando corresponde."
        imagen="/Portada 2.png"
      />

      {/* Sin relleno arriba (`pt-0`): la barra de filtros se superpone al borde inferior del banner (CLAUDE.md
          sección 6, regla 14). */}
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} space-y-8 px-4 pt-0 pb-16 sm:px-6 lg:px-8`}>
        {/* Búsqueda en vivo (CLAUDE.md sección 5): el proveedor comparte el estado "buscando" entre la barra de
            filtros y los resultados. No pinta nada propio, así que `space-y-8` sigue separándolos. */}
        <BusquedaProvider>
          <CatalogToolbar
            ciudades={ciudades}
            rubros={rubros}
            placeholderBusqueda="Buscar por producto o negocio..."
          />

          <ResultadosBusqueda className="space-y-6">
            <EncabezadoResultados
              total={paginacion.total}
              unidades={similares ? ["producto similar", "productos similares"] : ["producto", "productos"]}
              ciudades={ciudades}
              rubros={rubros}
            />

            {productos.length === 0 ? (
              hayFiltros ? (
                <SinResultadosBusqueda ruta="/promociones" plural="productos" />
              ) : (
                <EstadoVacio
                  icono={Package}
                  titulo="Aún no hay productos publicados"
                  descripcion="Vuelve pronto: las emprendedoras están subiendo sus productos y promociones."
                  className="bg-superficie"
                />
              )
            ) : (
              <div className="space-y-4">
                {similares && <AvisoResultadosSimilares busqueda={q} />}
                <CatalogGrid>
                  {productos.map((producto) => (
                    <ProductoCard key={producto.id} producto={producto} similar={similares} />
                  ))}
                </CatalogGrid>
              </div>
            )}

            <Paginador paginacion={paginacion} crearHref={crearHref} superficie />
          </ResultadosBusqueda>
        </BusquedaProvider>
      </div>
    </main>
  );
}
