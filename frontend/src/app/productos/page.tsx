import { Package, Shuffle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clasesBoton } from "@/components/atoms/Button";
import { AvisoResultadosSimilares } from "@/components/molecules/AvisoResultadosSimilares";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { Paginador } from "@/components/molecules/Paginador";
import { ProductoCompacto } from "@/components/molecules/ProductoCompacto";
import { BusquedaProvider, EncabezadoResultados, ResultadosBusqueda, SinResultadosBusqueda } from "@/components/organisms/BusquedaCatalogo";
import { CatalogHeader } from "@/components/organisms/CatalogHeader";
import { CatalogToolbar } from "@/components/organisms/CatalogToolbar";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { listarProductos } from "@/lib/api/productos";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { crearSemilla, semillaDe } from "@/lib/inicio/semilla";
import { idDeParametro, paginaDeParametro, ultimaPagina } from "@/lib/parametros";

export const metadata: Metadata = {
  title: "Productos — Track de Mujeres",
};

// 24 divide en 2, 3 y 4 columnas: la última fila de cada página queda completa en cualquier ancho.
const LIMITE = 24;

// Un valor de searchParams puede llegar repetido (?q=a&q=b); nos quedamos con el primero, como
// hacen los ejemplos de Next para este mismo caso (string | string[] | undefined).
function primerValor(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

// Productos (CLAUDE.md sección 6, regla 14, punto l): todos los productos como un mercado. Lo que antes era «Promociones». El orden es al azar
// y cambia en cada visita (regla 23 del backend): sin semilla en la dirección se inventa una y se conserva en los enlaces del paginador,
// así quien pasa de página no ve repetidos ni saltos; «Ver otra selección» lleva a otra. Con texto de búsqueda manda la relevancia (regla 21):
// sin semilla ni botón. La lógica de precio y descuento llega resuelta del backend (reglas 7 y 8): esta página solo la muestra.
export default async function PaginaProductos({ searchParams }: PageProps<"/productos">) {
  const parametros = await searchParams;
  // El backend acepta de 1 a 100 caracteres (regla 21): un texto más largo, escrito a mano en la URL, no debe llegar
  // a la API ni terminar en una página de error.
  const q = primerValor(parametros.q).trim().slice(0, 100);
  // Un id o una página que el backend rechazaría (400) se ignoran: el enlace sigue mostrando el catálogo.
  const ciudadId = idDeParametro(primerValor(parametros.ciudad_id));
  const rubroId = idDeParametro(primerValor(parametros.rubro_id));
  const pagina = paginaDeParametro(primerValor(parametros.pagina));
  const hayFiltros = Boolean(q || ciudadId || rubroId);
  const alAzar = !q;
  const semilla = alAzar ? semillaDe(primerValor(parametros.semilla)) : undefined;

  const [ciudades, rubros, { datos: productos, paginacion, similares }] = await Promise.all([
    listarCiudades(),
    listarRubros(),
    listarProductos({
      q: q || undefined,
      ciudad_id: ciudadId || undefined,
      rubro_id: rubroId || undefined,
      pagina,
      limite: LIMITE,
      ...(alAzar ? { orden: "aleatorio" as const, semilla } : {}),
    }),
  ]);

  // Los filtros que se conservan al pasar de página o al pedir otra selección.
  function hrefCon(nuevaSemilla: string | undefined, nuevaPagina?: number): string {
    const parametrosUrl = new URLSearchParams();
    if (q) parametrosUrl.set("q", q);
    if (ciudadId) parametrosUrl.set("ciudad_id", ciudadId);
    if (rubroId) parametrosUrl.set("rubro_id", rubroId);
    if (nuevaSemilla) parametrosUrl.set("semilla", nuevaSemilla);
    if (nuevaPagina) parametrosUrl.set("pagina", String(nuevaPagina));
    const query = parametrosUrl.toString();
    return query ? `/productos?${query}` : "/productos";
  }

  // Una página que ya no existe lleva a la última (con la misma semilla), no a «aún no hay productos».
  const ultima = ultimaPagina(paginacion.total, LIMITE);
  if (pagina > ultima) redirect(hrefCon(semilla, ultima));

  return (
    <main className="flex-1">
      <CatalogHeader
        titulo="Productos"
        descripcion="Todo lo que ofrecen las emprendedoras de la comunidad Track de Mujeres."
        imagen="/Portada 2.png"
      />

      {/* Sin relleno arriba (`pt-0`): la barra de filtros se superpone al borde inferior del banner (CLAUDE.md
          sección 6, regla 14). */}
      <div className={`mx-auto w-full ${CONTENEDOR_PUBLICO} space-y-8 px-4 pt-0 pb-16 sm:px-6 lg:px-8`}>
        {/* Búsqueda en vivo (CLAUDE.md sección 5): el proveedor comparte el estado "buscando" entre la barra de
            filtros y los resultados. No pinta nada propio, así que `space-y-8` sigue separándolos. */}
        <BusquedaProvider>
          <CatalogToolbar ciudades={ciudades} rubros={rubros} placeholderBusqueda="Buscar por producto o negocio..." />

          <ResultadosBusqueda className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <EncabezadoResultados
                total={paginacion.total}
                unidades={similares ? ["producto similar", "productos similares"] : ["producto", "productos"]}
                ciudades={ciudades}
                rubros={rubros}
              />
              {alAzar && productos.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-cuerpo text-sm text-texto-secundario">
                  <span>Los productos cambian de orden cada vez que entras.</span>
                  {/* `prefetch={false}`: la dirección lleva una semilla nueva, que no tiene sentido precargar. */}
                  <Link href={hrefCon(crearSemilla())} prefetch={false} className={clasesBoton("contorno", "group/otra", "compacto")}>
                    <Shuffle size={16} strokeWidth={1.75} aria-hidden="true" className="transition-transform duration-300 group-hover/otra:rotate-180 motion-reduce:transition-none" />
                    Ver otra selección
                  </Link>
                </div>
              )}
            </div>

            {productos.length === 0 ? (
              hayFiltros ? (
                <SinResultadosBusqueda ruta="/productos" plural="productos" />
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
                <div className="entrada-escalonada grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-3 rejilla:grid-cols-4">
                  {productos.map((producto) => (
                    <ProductoCompacto key={producto.id} producto={producto} similar={similares} />
                  ))}
                </div>
              </div>
            )}

            <Paginador paginacion={paginacion} crearHref={(nuevaPagina) => hrefCon(semilla, nuevaPagina)} superficie />
          </ResultadosBusqueda>
        </BusquedaProvider>
      </div>
    </main>
  );
}
