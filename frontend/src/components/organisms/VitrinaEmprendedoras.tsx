import Link from "next/link";
import { EmprendedoraCard } from "@/components/molecules/EmprendedoraCard";
import { CatalogGrid } from "@/components/organisms/CatalogGrid";
import { listarPerfiles } from "@/lib/api/perfiles";
import { CLASES_FOCO_ENLACE } from "@/lib/estilos";

const LIMITE = 6;

// Responde directo a la crítica de que la Home no mostraba nada real: perfiles de verdad, no
// datos de ejemplo. Si el catálogo está vacío, la sección no se rompe: solo no muestra nada
// (nunca un placeholder inventado en su lugar).
export async function VitrinaEmprendedoras() {
  const { datos: perfiles } = await listarPerfiles({ limite: LIMITE });
  if (perfiles.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-titulo text-2xl font-extrabold text-texto">Conoce a nuestras emprendedoras</h2>
          <p className="font-cuerpo text-sm text-texto-secundario">
            Algunos de los negocios de la comunidad Track de Mujeres.
          </p>
        </div>
        <Link
          href="/emprendedoras"
          className={`font-cuerpo text-sm font-medium text-acento transition-colors hover:text-acento-hover ${CLASES_FOCO_ENLACE}`}
        >
          Ver todas →
        </Link>
      </div>

      <CatalogGrid>
        {perfiles.map((perfil) => (
          <EmprendedoraCard key={perfil.id} perfil={perfil} />
        ))}
      </CatalogGrid>
    </section>
  );
}
