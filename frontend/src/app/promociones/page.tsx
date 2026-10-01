import type { Metadata } from "next";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { CatalogHeader } from "@/components/organisms/CatalogHeader";
import { CatalogToolbar } from "@/components/organisms/CatalogToolbar";
import { ProductoCard } from "@/components/molecules/ProductoCard";
import { Paginador } from "@/components/molecules/Paginador";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { listarProductos } from "@/lib/api/productos";

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
  const q = primerValor(parametros.q);
  const ciudadId = primerValor(parametros.ciudad_id);
  const rubroId = primerValor(parametros.rubro_id);
  const pagina = Number(primerValor(parametros.pagina)) || 1;

  const [ciudades, rubros, { datos: productos, paginacion }] = await Promise.all([
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

      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <CatalogToolbar ciudades={ciudades} rubros={rubros} />

        {productos.length === 0 ? (
          <p className="py-16 text-center font-cuerpo text-sm text-texto-secundario">
            No se encontraron productos con esos filtros.
          </p>
        ) : (
          <CatalogGrid>
            {productos.map((producto) => (
              <ProductoCard key={producto.id} producto={producto} />
            ))}
          </CatalogGrid>
        )}

        <Paginador paginacion={paginacion} crearHref={crearHref} />
      </div>
    </main>
  );
}
