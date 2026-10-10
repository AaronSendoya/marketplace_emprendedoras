import { Users } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BusquedaProvider, EncabezadoResultados, ResultadosBusqueda, SinResultadosBusqueda } from "@/components/organisms/BusquedaCatalogo";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { CatalogHeader } from "@/components/organisms/CatalogHeader";
import { CatalogToolbar } from "@/components/organisms/CatalogToolbar";
import { AvisoResultadosSimilares } from "@/components/molecules/AvisoResultadosSimilares";
import { EmprendedoraCard } from "@/components/molecules/EmprendedoraCard";
import { EstadoVacio } from "@/components/molecules/EstadoVacio";
import { Paginador } from "@/components/molecules/Paginador";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { listarPerfiles } from "@/lib/api/perfiles";
import { CONTENEDOR_PUBLICO } from "@/lib/estilos";
import { idDeParametro, paginaDeParametro, ultimaPagina } from "@/lib/parametros";

export const metadata: Metadata = {
  title: "Emprendedoras — Track de Mujeres",
};

const LIMITE = 12;

// Un valor de searchParams puede llegar repetido (?q=a&q=b); nos quedamos con el primero, como
// hacen los ejemplos de Next para este mismo caso (string | string[] | undefined).
function primerValor(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export default async function PaginaEmprendedoras({ searchParams }: PageProps<"/emprendedoras">) {
  const parametros = await searchParams;
  // El backend acepta de 1 a 100 caracteres (regla 20): un texto más largo, escrito a mano en la URL, no debe llegar
  // a la API ni terminar en una página de error.
  const q = primerValor(parametros.q).trim().slice(0, 100);
  // Un id o una página que el backend rechazaría (400) se ignoran: el enlace sigue mostrando el catálogo.
  const ciudadId = idDeParametro(primerValor(parametros.ciudad_id));
  const rubroId = idDeParametro(primerValor(parametros.rubro_id));
  const pagina = paginaDeParametro(primerValor(parametros.pagina));
  const hayFiltros = Boolean(q || ciudadId || rubroId);

  const [ciudades, rubros, { datos: perfiles, paginacion, similares }] = await Promise.all([
    listarCiudades(),
    listarRubros(),
    listarPerfiles({
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
    return `/emprendedoras?${parametrosUrl.toString()}`;
  }

  // Una página que ya no existe (un enlace viejo, o se quitaron emprendimientos) lleva a la última, no a «aún no hay emprendedoras».
  const ultima = ultimaPagina(paginacion.total, LIMITE);
  if (pagina > ultima) redirect(crearHref(ultima));

  return (
    <main className="flex-1">
      <CatalogHeader
        titulo="Emprendedoras"
        descripcion="Conoce a las emprendedoras de la comunidad Track de Mujeres."
        imagen="/Portada 1.png"
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
            placeholderBusqueda="Buscar por nombre, negocio o producto..."
          />

          <ResultadosBusqueda className="space-y-6">
            <EncabezadoResultados
              total={paginacion.total}
              unidades={similares ? ["emprendedora similar", "emprendedoras similares"] : ["emprendedora", "emprendedoras"]}
              ciudades={ciudades}
              rubros={rubros}
            />

            {perfiles.length === 0 ? (
              hayFiltros ? (
                <SinResultadosBusqueda ruta="/emprendedoras" plural="emprendedoras" />
              ) : (
                <EstadoVacio
                  icono={Users}
                  titulo="Aún no hay emprendedoras publicadas"
                  descripcion="Vuelve pronto: estamos sumando nuevos emprendimientos a la comunidad."
                  className="bg-superficie"
                />
              )
            ) : (
              <div className="space-y-4">
                {similares && <AvisoResultadosSimilares busqueda={q} />}
                <CatalogGrid>
                  {perfiles.map((perfil) => (
                    <EmprendedoraCard key={perfil.id} perfil={perfil} similar={similares} />
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
