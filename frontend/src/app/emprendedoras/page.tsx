import type { Metadata } from "next";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { CatalogHeader } from "@/components/organisms/CatalogHeader";
import { CatalogToolbar } from "@/components/organisms/CatalogToolbar";
import { EmprendedoraCard } from "@/components/molecules/EmprendedoraCard";
import { Paginador } from "@/components/molecules/Paginador";
import { listarCiudades, listarRubros } from "@/lib/api/catalogos";
import { listarPerfiles } from "@/lib/api/perfiles";

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
  const q = primerValor(parametros.q);
  const ciudadId = primerValor(parametros.ciudad_id);
  const rubroId = primerValor(parametros.rubro_id);
  const pagina = Number(primerValor(parametros.pagina)) || 1;

  const [ciudades, rubros, { datos: perfiles, paginacion }] = await Promise.all([
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

  return (
    <main className="flex-1">
      <CatalogHeader
        titulo="Emprendedoras"
        descripcion="Conoce a las emprendedoras de la comunidad Track de Mujeres."
        imagen="/Portada 1.png"
      />

      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <CatalogToolbar ciudades={ciudades} rubros={rubros} />

        {perfiles.length === 0 ? (
          <p className="py-16 text-center font-cuerpo text-sm text-texto-secundario">
            No se encontraron emprendedoras con esos filtros.
          </p>
        ) : (
          <CatalogGrid>
            {perfiles.map((perfil) => (
              <EmprendedoraCard key={perfil.id} perfil={perfil} />
            ))}
          </CatalogGrid>
        )}

        <Paginador paginacion={paginacion} crearHref={crearHref} />
      </div>
    </main>
  );
}
